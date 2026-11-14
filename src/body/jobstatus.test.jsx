import ReactDOMServer from "react-dom/server";
import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
import { notification } from "antd";
import JobStatus from "./jobstatus";

let job;

beforeEach(() => {
  job = Object.create(JobStatus.prototype);
  job.props = {
    jobdate: "2026-10-24",
    jobid: "test-job",
    jobtype: "apbs",
  };
  job.state = {
    show_log_line_numbers: true,
    filesizes: {
      apbs: { "2026-10-24/test-job/output.log": 2048 },
    },
  };
});

it("renders highlighted log text with the upgraded highlighter", () => {
  const markup = ReactDOMServer.renderToStaticMarkup(
    job.renderCodeBlock('print("completed")', "python", "output.log")
  );

  expect(markup).toContain('style="color:#98c379"');
  expect(markup).toContain("completed");
  expect(markup).toContain("react-syntax-highlighter-line-number");
});

it("keeps log contents as text rather than HTML", () => {
  const text = "<script>alert('log text')</script>";
  const container = document.createElement("div");
  container.innerHTML = ReactDOMServer.renderToStaticMarkup(
    job.renderCodeBlock(text, "plaintext", "output.log")
  );

  expect(container.querySelector("script")).toBeNull();
  expect(container.textContent).toContain(text);
});

it("preserves the last 1000 lines when previewing a large log", () => {
  const text = Array.from(
    { length: 1100 },
    (_, index) => `log-row-${String(index).padStart(4, "0")}`
  ).join("\n");
  const container = document.createElement("div");
  container.innerHTML = ReactDOMServer.renderToStaticMarkup(
    job.renderCodeBlock(text, "plaintext", "output.log")
  );

  expect(container.textContent).toContain("Displaying last 1000 lines");
  expect(container.textContent).not.toContain("log-row-0099");
  expect(container.textContent).toContain("log-row-0100");
  expect(container.textContent).toContain("log-row-1099");
});

describe("job status and results", () => {
  const originalEnv = window._env_;
  const originalFetch = window.fetch;
  const originalMatchMedia = window.matchMedia;
  const prefix = "2026-10-24/test-job";
  let container;
  let status;

  async function tick() {
    await act(async () => {
      jest.advanceTimersByTime(1000);
      // Drain status JSON, file-size, and log-fetch promise chains.
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
  }

  function renderStatus(jobtype = "apbs") {
    act(() => {
      ReactDOM.render(
        <MemoryRouter>
          <JobStatus
            jobid="test-job"
            jobdate="2026-10-24"
            jobtype={jobtype}
            combinedJobIdDate="test-job_20261024"
          />
        </MemoryRouter>,
        container
      );
    });
  }

  beforeEach(() => {
    jest.useFakeTimers();
    window._env_ = {
      GA_TRACKING_ID: "",
      REACT_APP_GA_MEASUREMENT_ID: "",
      OUTPUT_BUCKET_HOST: "https://outputs.example",
      VIZ_URL: "https://viz.example",
      REGISTRATION_URL: "/register",
    };
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    jest.spyOn(notification, "warning").mockImplementation(() => {});
    status = {
      jobid: "test-job",
      apbs: {
        status: "running",
        startTime: 100,
        endTime: null,
        subtasks: [],
        files: [],
        inputFiles: ["https://inputs.example/protein.pqr"],
        outputFiles: [`${prefix}/potential.dx`, `${prefix}/apbs.stdout.txt`],
      },
      pdb2pqr: {
        status: "running",
        startTime: 100,
        endTime: null,
        subtasks: [],
        files: [],
        inputFiles: [`${prefix}/protein.pdb`],
        outputFiles: [`${prefix}/protein.pqr`],
      },
    };
    window.fetch = jest.fn().mockImplementation((url, options) => {
      if (options && options.method === "HEAD") {
        return Promise.resolve({
          ok: !url.endsWith("pdb2pqr-status.json"),
          headers: { get: () => "2048" },
        });
      }
      if (url.endsWith("-status.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(status) });
      }
      return Promise.resolve({ ok: true, text: () => Promise.resolve("Job done") });
    });
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => ReactDOM.unmountComponentAtNode(container));
    container.remove();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    window._env_ = originalEnv;
    window.fetch = originalFetch;
    window.matchMedia = originalMatchMedia;
  });

  it("polls a running APBS job, then exposes results and stops polling on completion", async () => {
    renderStatus();
    await tick();
    expect(window.fetch).toHaveBeenCalledWith(
      `https://outputs.example/${prefix}/apbs-status.json`
    );
    expect(container.textContent).toContain("Running");
    expect(container.querySelector('a[href*="viz.example"]')).toBeNull();
    expect(window.fetch).not.toHaveBeenCalledWith(
      `https://outputs.example/${prefix}/potential.dx`, { method: "HEAD" }
    );

    status.apbs.status = "complete";
    status.apbs.endTime = 160;
    await tick();
    expect(container.querySelector(
      `a[href="https://outputs.example/${prefix}/potential.dx"]`
    )).not.toBeNull();
    expect(container.textContent).toContain("2 KB");
    expect(container.querySelector(
      'a[href="https://viz.example?jobid=test-job&pqr=protein&date=2026-10-24"]'
    )).not.toBeNull();
    expect(window.fetch).toHaveBeenCalledWith(
      `https://outputs.example/${prefix}/apbs.stdout.txt`
    );
    const calls = window.fetch.mock.calls.length;
    await tick();
    await tick();
    expect(window.fetch).toHaveBeenCalledTimes(calls);
  });

  it("offers a dated APBS continuation link after PDB2PQR completes", async () => {
    status.pdb2pqr.status = "complete";
    status.pdb2pqr.endTime = 160;
    renderStatus("pdb2pqr");
    await tick();

    expect(container.querySelector(
      'a[href="/apbs?jobid=test-job&date=2026-10-24"]'
    )).not.toBeNull();
    expect(container.querySelector(
      `a[href="https://outputs.example/${prefix}/protein.pqr"]`
    )).not.toBeNull();
    const calls = window.fetch.mock.calls.length;
    await tick();
    expect(window.fetch).toHaveBeenCalledTimes(calls);
  });

  it("retains failed-job downloads without enabling visualization or continuing to poll", async () => {
    status.apbs.status = "failed";
    status.apbs.subtasks = [{
      name: "apbs-executor",
      state: "terminated",
      state_info: { reason: "OOMKilled" },
    }];
    renderStatus();
    await tick();

    expect(container.querySelector(
      `a[href="https://outputs.example/${prefix}/apbs.stdout.txt"]`
    )).not.toBeNull();
    expect(container.querySelector('a[href*="viz.example"]')).toBeNull();
    const calls = window.fetch.mock.calls.length;
    await tick();
    expect(window.fetch).toHaveBeenCalledTimes(calls);
  });

  it.each(["apbs", "pdb2pqr"])("retries a %s job after repeated HTTP failures and cleans up restarted timers", async jobtype => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const fetchImplementation = window.fetch.getMockImplementation();
    window.fetch.mockResolvedValue({ ok: false, status: 404 });
    renderStatus(jobtype);
    for (let i = 0; i < 12; i++) await tick();

    expect(container.textContent).toContain("N/A");
    const retry = Array.from(container.querySelectorAll("button")).find(
      button => button.textContent.includes("Retry")
    );
    expect(retry).toBeDefined();
    const calls = window.fetch.mock.calls.length;
    await tick();
    expect(window.fetch).toHaveBeenCalledTimes(calls);

    window.fetch.mockImplementation(fetchImplementation);
    act(() => retry.click());
    await tick();
    expect(window.fetch).toHaveBeenCalledTimes(calls + 1);
    expect(container.textContent).toContain("Running");
    await tick();
    expect(container.textContent).not.toContain("N/A");

    status[jobtype].status = "complete";
    status[jobtype].endTime = 160;
    await tick();
    const completedCalls = window.fetch.mock.calls.length;
    await tick();
    expect(window.fetch).toHaveBeenCalledTimes(completedCalls);
    act(() => ReactDOM.unmountComponentAtNode(container));
    expect(jest.getTimerCount()).toBe(0);
  });

  it("stops polling when the status page is unmounted", async () => {
    renderStatus("pdb2pqr");
    await tick();
    act(() => ReactDOM.unmountComponentAtNode(container));
    const calls = window.fetch.mock.calls.length;
    await tick();
    expect(window.fetch).toHaveBeenCalledTimes(calls);
  });
});
