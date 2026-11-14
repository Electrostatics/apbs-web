import React from "react";
import ReactDOM from "react-dom";
import { act, Simulate } from "react-dom/test-utils";
import { MemoryRouter, Route } from "react-router-dom";
import ConfigAPBS from "./configapbs";
import ConfigPDB2PQR from "./configpdb2pqr";

const originalEnv = window._env_;
const originalFetch = window.fetch;
const originalMatchMedia = window.matchMedia;
const jobid = "test-job";
const date = "2026-10-24";
let container;
let location;

// Ant Design validation and Upload both defer work beyond the DOM event.
async function flushUpdates(action = () => {}) {
  await act(async () => {
    action();
    await new Promise(resolve => setTimeout(resolve, 0));
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

function renderForm(element) {
  act(() => {
    ReactDOM.render(
      <MemoryRouter>
        <div>
          {element}
          <Route render={props => {
            location = props.location;
            return null;
          }} />
        </div>
      </MemoryRouter>,
      container
    );
  });
}

async function selectFile(selector, file) {
  const input = container.querySelector(selector);
  expect(input).not.toBeNull();
  await flushUpdates(() => Simulate.change(input, {
    target: { files: [file] },
  }));
}

async function submit() {
  await flushUpdates(() => Simulate.submit(container.querySelector("form")));
}

function uploadedConfig(filename) {
  const call = window.fetch.mock.calls.find(([url]) =>
    url === `/uploads/${filename}`
  );
  expect(call).toBeDefined();
  return JSON.parse(call[1].body);
}

beforeEach(() => {
  window._env_ = {
    GA_TRACKING_ID: "",
    REACT_APP_GA_MEASUREMENT_ID: "",
    API_TOKEN_URL: "/api/upload",
    OUTPUT_BUCKET_HOST: "https://outputs.example",
    AUTOFILL_URL: "/autofill",
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
  window.fetch = jest.fn().mockImplementation((url, options) => {
    if (url === "/api/upload") {
      const { file_list } = JSON.parse(options.body);
      return Promise.resolve({
        json: () => Promise.resolve({
          job_id: jobid,
          date,
          urls: Object.fromEntries(file_list.map(name => [
            name, { upload_url: `/uploads/${name}` },
          ])),
        }),
      });
    }
    return Promise.resolve({ status: 201 });
  });
  container = document.createElement("div");
  location = null;
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => ReactDOM.unmountComponentAtNode(container));
  container.remove();
  window._env_ = originalEnv;
  window.fetch = originalFetch;
  window.matchMedia = originalMatchMedia;
  jest.restoreAllMocks();
});

it("validates the PDB ID before submitting a PDB2PQR job", async () => {
  renderForm(<ConfigPDB2PQR />);
  await submit();

  expect(container.textContent).toContain("Please input a PDB ID");
  expect(window.fetch).not.toHaveBeenCalled();
  expect(location.pathname).toBe("/");
});

it("submits the selected PDB2PQR options and redirects to the dated job", async () => {
  renderForm(<ConfigPDB2PQR />);
  await flushUpdates(() => {
    Simulate.change(container.querySelector('input[name="PDBID"]'), {
      target: { name: "PDBID", value: "1UBQ" },
    });
    container.querySelector('input[name="FF"][value="amber"]').click();
    container.querySelector('input[name="PKACALCMETHOD"][value="none"]').click();
  });
  await submit();

  expect(window.fetch).toHaveBeenCalledWith("/api/upload", {
    method: "POST",
    body: JSON.stringify({ file_list: ["pdb2pqr-job.json"] }),
  });
  const payload = uploadedConfig("pdb2pqr-job.json");
  expect(payload.form).toMatchObject({
    PDBID: "1UBQ",
    PDBSOURCE: "ID",
    FF: "amber",
    PKACALCMETHOD: "none",
    DEBUMP: "atomsnotclose",
    OPT: "optimizeHnetwork",
    INPUT: "makeapbsin",
    DROPWATER: "removewater",
  });
  expect(payload.metadata.cli.command).toContain("--ff=AMBER");
  expect(payload.metadata.cli.command).not.toContain("--with-ph");
  expect(payload.metadata.cli.command).toContain("1UBQ.pdb 1UBQ.pqr");
  expect(location.pathname + location.search).toBe(
    `/jobstatus?jobtype=pdb2pqr&jobid=${jobid}&date=${date}`
  );
});

it("uploads a selected PDB before the PDB2PQR job configuration", async () => {
  renderForm(<ConfigPDB2PQR />);
  await flushUpdates(() => {
    container.querySelector('input[name="PDBSOURCE"][value="UPLOAD"]').click();
  });
  const file = new File(["ATOM protein"], "protein.pdb");
  await selectFile('input[type="file"][accept=".pdb"]', file);
  expect(window.fetch).not.toHaveBeenCalled();
  await submit();

  expect(window.fetch).toHaveBeenCalledWith("/uploads/protein.pdb", {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": "application/octet-stream",
      "x-ms-blob-type": "BlockBlob",
    },
  });
  expect(uploadedConfig("pdb2pqr-job.json").form).toMatchObject({
    PDBSOURCE: "UPLOAD",
    PDBFILE: "protein.pdb",
  });
  expect(window.fetch.mock.calls.map(([url]) => url)).toEqual([
    "/api/upload", "/uploads/protein.pdb", "/uploads/pdb2pqr-job.json",
  ]);
  expect(location.pathname).toBe("/jobstatus");
});

async function prepareAPBS() {
  renderForm(<ConfigAPBS />);
  expect(container.querySelector('button[type="submit"]').disabled).toBe(true);
  const infile = new File(["read\nmol pqr protein.pqr\nend"], "protein.in");
  // jsdom's File lacks the browser Blob.text API used by the input inspector.
  infile.text = () => Promise.resolve("read\nmol pqr protein.pqr\nend");
  await selectFile('input[type="file"][accept=".in"]', infile);
  expect(container.querySelector('button[type="submit"]').disabled).toBe(true);
  const pqr = new File(["ATOM protein"], "protein.pqr");
  await selectFile('input[type="file"]:not([accept=".in"])', pqr);
  expect(container.querySelector('button[type="submit"]').disabled).toBe(false);
  return { infile, pqr };
}

it("submits an APBS input and supporting files through the Azure upload API", async () => {
  const { infile, pqr } = await prepareAPBS();
  expect(window.fetch).not.toHaveBeenCalled();
  await submit();

  expect(JSON.parse(window.fetch.mock.calls[0][1].body)).toEqual({
    file_list: ["protein.in", "protein.pqr", "apbs-job.json"],
  });
  expect(window.fetch).toHaveBeenCalledWith("/uploads/protein.in",
    expect.objectContaining({ method: "PUT", body: infile }));
  expect(window.fetch).toHaveBeenCalledWith("/uploads/protein.pqr",
    expect.objectContaining({ method: "PUT", body: pqr }));
  expect(uploadedConfig("apbs-job.json")).toEqual({
    form: { filename: "protein.in", support_files: ["protein.pqr"] },
    metadata: {},
  });
  expect(location.pathname + location.search).toBe(
    `/jobstatus?jobtype=apbs&jobid=${jobid}&date=${date}`
  );
});

it("autofills and submits APBS using an existing PDB2PQR job", async () => {
  const fetchImplementation = window.fetch.getMockImplementation();
  window.fetch.mockImplementation((url, options) => {
    if (url === `https://outputs.example/${date}/${jobid}/${jobid}.in`) {
      return Promise.resolve({
        text: () => Promise.resolve([
          "read", `mol pqr ${jobid}.pqr`, "end", "elec", "mg-auto",
          "dime 65 65 65", "cglen 40 50 60", "fglen 20 30 40",
          "pdie 2", "sdie 78.54", "sdens 10", "srad 1.4",
          "swin 0.3", "temp 298.15", "end",
        ].join("\n")),
      });
    }
    return fetchImplementation(url, options);
  });
  renderForm(<ConfigAPBS jobid={jobid} jobdate={date} />);
  await flushUpdates();
  await flushUpdates(() => {
    container.querySelector('input[name="removewater"]').click();
  });
  await submit();

  expect(window.fetch).toHaveBeenCalledWith("/api/upload", {
    method: "POST",
    body: JSON.stringify({ job_id: jobid, file_list: ["apbs-job.json"] }),
  });
  expect(uploadedConfig("apbs-job.json").form).toMatchObject({
    pdb2pqrid: jobid,
    type: "mg-auto",
    pdie: 2,
    sdie: 78.54,
    dimenx: 65,
    cglenx: 40,
    fglenz: 40,
    removewater: "on",
    output_scalar: ["writepot"],
    writeformat: "dx",
  });
  expect(location.pathname + location.search).toBe(
    `/jobstatus?jobtype=apbs&jobid=${jobid}&date=${date}`
  );
});

it("keeps APBS submission pending until supporting files finish uploading", async () => {
  await prepareAPBS();
  let finishUpload;
  const fetchImplementation = window.fetch.getMockImplementation();
  window.fetch.mockImplementation((url, options) => {
    if (url === "/uploads/protein.pqr") {
      return new Promise(resolve => { finishUpload = resolve; });
    }
    return fetchImplementation(url, options);
  });
  await submit();

  expect(container.textContent).toContain("Submitting job...");
  expect(location.pathname).toBe("/");
  expect(window.fetch.mock.calls.map(([url]) => url)).not.toContain(
    "/uploads/apbs-job.json"
  );
  await flushUpdates(() => finishUpload({ status: 201 }));
  expect(location.pathname).toBe("/jobstatus");
});

it("does not redirect after a supporting-file upload fails", async () => {
  await prepareAPBS();
  const fetchImplementation = window.fetch.getMockImplementation();
  window.fetch.mockImplementation((url, options) => {
    if (url === "/uploads/protein.pqr") {
      return Promise.resolve({ status: 403 });
    }
    return fetchImplementation(url, options);
  });
  await submit();

  expect(location.pathname).toBe("/");
  expect(container.textContent).toContain("Start Job");
  expect(container.textContent).not.toContain("Submitting job...");
});
