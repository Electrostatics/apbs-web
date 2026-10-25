import ReactDOMServer from "react-dom/server";
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
