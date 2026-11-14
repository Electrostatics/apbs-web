import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import PAGES from './common/pagenames';

const originalEnv = window._env_;
const originalFetch = window.fetch;
const originalMatchMedia = window.matchMedia;
const originalTitle = document.title;
let container;

beforeEach(() => {
  window._env_ = {
    GA_TRACKING_ID: '',
    REACT_APP_GA_MEASUREMENT_ID: '',
    ANNOUNCEMENTS_URL: '/info/announcements.json',
    PROJECT_HOME_URL: '/',
    REGISTRATION_URL: '/register',
  };
  window.fetch = jest.fn().mockResolvedValue({
    json: jest.fn().mockResolvedValue([]),
  });
  window.matchMedia = jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => {
    ReactDOM.unmountComponentAtNode(container);
  });
  container.remove();
  window._env_ = originalEnv;
  window.fetch = originalFetch;
  window.matchMedia = originalMatchMedia;
  document.title = originalTitle;
});

it('renders the home page without crashing', async () => {
  await act(async () => {
    ReactDOM.render(
      <MemoryRouter>
        <App
          page={PAGES.home}
          openSubmenus={{}}
          isMenuCollapsed={false}
          submenuOnClick={jest.fn()}
          onSiderCollapse={jest.fn()}
        />
      </MemoryRouter>,
      container
    );
  });

  expect(document.title).toBe('APBS | Home');
  expect(container.textContent).toContain('Welcome to the new home');
  expect(container.querySelector('a[href="/pdb2pqr"]')).not.toBeNull();
  expect(window.fetch).toHaveBeenCalledTimes(1);
  expect(window.fetch).toHaveBeenCalledWith(
    '/info/announcements.json',
    expect.any(Object)
  );
});
