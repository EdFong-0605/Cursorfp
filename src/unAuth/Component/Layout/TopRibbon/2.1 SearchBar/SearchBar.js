/**
 * (Function meaning):
 *   This file defines the site search bar: you choose which client to search, type your search words, then submit. The list of clients can come from the parent screen, or this component can load that list from the server by itself.
 * (External references):
 *   `./SearchBar.css` — styles for this bar. `../../../API/clientfetch.js` — function that loads clients from the backend. Often mounted inside `TopRibbon.js`.
 */
// (Function meaning):
//   `useState` = React’s way to remember values that can change; when they change, React redraws this part of the page. `useEffect` = React’s way to run side work after the screen updates (for example: fetch data once, or react when a value changes).
// (External references):
//   Package name `react` in the project’s `package.json`.
import { useEffect, useState } from 'react';
// (Function meaning):
//   Load the CSS file so the class names in this file (for example `searchbar__form`) get their colors, spacing, and layout.
// (External references):
//   `./SearchBar.css` in the same folder as this file.
import './SearchBar.css';
// (Function meaning):
//   Import the small React component that renders a Font Awesome icon (here: the magnifying glass on the submit button).
// (External references):
//   npm package `@fortawesome/react-fontawesome`.
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// (Function meaning):
//   Import only the magnifying-glass icon symbol so the built app stays smaller than if we imported every icon in the library.
// (External references):
//   npm package `@fortawesome/free-solid-svg-icons`.
import { faChevronDown, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
// (Function meaning):
//   Import the helper that calls the backend and returns client rows for the dropdown when the parent does not pass a ready-made list.
// (External references):
//   `src/unAuth/Component/API/clientfetch.js` — often paired with Python code under `functions/`.
import { fetchDummyClientsFromMainPy } from '../../../API/clientfetch';

/**
 * (Function meaning):
 *   The `SearchBar` function builds a form: placeholder text in the search field, an optional client list from the parent, and an optional `onSearch` callback when the user submits.
 * (External references):
 *   Any file that renders `<SearchBar ... />` supplies these props.
 * @param {object} props
 * @param {string} [props.placeholder]
 * @param {{ id: string, label: string }[]} [props.clients] — if set, this component does not fetch clients itself
 * @param {(query: string, context: { clientId: string }) => void} [props.onSearch]
 */
function SearchBar({ placeholder = 'Search…', clients: clientsProp, onSearch }) {
  // (Function meaning):
  //   `parentProvidesList` is `true` when the parent passed the `clients` prop (even if that array is empty `[]`); then we use that array and we do not run our own network fetch. It is `false` when `clients` was omitted, so we may fetch the list inside this component.
  // (External references):
  //   Parent usage: `<SearchBar />` → no `clients` → we fetch. `<SearchBar clients={data} />` → we use `data` as `clientsProp`.
  const parentProvidesList = clientsProp !== undefined;

  // (Function meaning):
  //   `fetchedClients` stores the list we loaded inside this bar. It starts as `null`, which means “not finished loading yet.” After the request completes it becomes an array (possibly with zero items). We use `null` instead of starting with `[]` so “still loading” is not mistaken for “loaded and there are no clients.”
  // (External references):
  //   `useState` from `react` at the top of this file. The `useEffect` that fetches clients calls `setFetchedClients`. The derived value `clientOptions` reads this when the parent did not pass a list.
  const [fetchedClients, setFetchedClients] = useState(null);
  // (Function meaning):
  //   `query` holds exactly what appears in the search box. Each keystroke updates `query` through `setQuery`, and the input uses `value={query}` so React always owns the text you see. That pairing is called a controlled input: React is the single source of truth for the field’s value.
  // (External references):
  //   The `<input>` below uses `value={query}` and `onChange` → `setQuery`. `handleSubmit` reads `query` and trims it.
  const [query, setQuery] = useState('');
  // (Function meaning):
  //   `clientId` is the string id of the row selected in the client dropdown. It starts as `''`; a separate `useEffect` later aligns it with a valid option once options exist.
  // (External references):
  //   The `<select>` uses `value={clientId}`. `handleSubmit` passes `{ clientId }` into `onSearch` if provided.
  const [clientId, setClientId] = useState('');

  // (Function meaning):
  //   When the parent did not pass clients, run a one-time load: call the fetch helper, then save the returned rows into `fetchedClients`. The local variable `cancelled` is set to `true` in the effect’s cleanup so a slow response that arrives after unmount or after a re-run does not call `setFetchedClients` (avoids React warnings and stale UI).
  // (External references):
  //   `fetchDummyClientsFromMainPy` in `clientfetch.js`. Reads `parentProvidesList` from [SearchBar.js, line 48].
  
  //use effect meaning:  
  // 1) if the parent provided list then do nothing, continue otherwise 
  // 2) set the cancelled variable to false so it can be used to check if response is still needed 
  // 3) immediately invoked asnc function: wait for `rows`, then if this effect run is still valid (`!cancelled`), store `rows` in state.
  // 4) re-do this as many times as needed (for example, when the user changes the client selection)
  // 5) return a cleanup function if the component is unmounted or the dependencies change
  //  
  // useeffect format:
  //  useeffect(() => {
  //    code to run
  //    return () => {
  //      code to run when the component is unmounted or the dependencies change
  //    }
  //  }, [dependencies]); <- anything 
  useEffect(() => {

    if (parentProvidesList) return undefined;

    let cancelled = false;

    (async () => {
      const rows = await fetchDummyClientsFromMainPy();
      if (!cancelled) setFetchedClients(rows);
    })();

    return () => {
      cancelled = true;
    };
  }, [parentProvidesList]);

  // (Function meaning):
  //   `clientOptions` is the array we map into `<option>` elements: if the parent passed `clients`, use `clientsProp`; otherwise use `fetchedClients`, but if `fetchedClients` is still `null` use `[]` so we never call `.map` on `null` (which would crash).
  // (External references):
  //   Used in JSX for `.map` on options and for `disabled={!clientOptions.length}` on the `<select>`.
  const clientOptions = parentProvidesList ? clientsProp : (fetchedClients ?? []);

  // (Function meaning):
  //   Whenever `clientOptions` changes: if there is at least one option, make sure `clientId` still matches a real id—keep the previous id if it still exists in the new list, otherwise set the id to the first option’s id. That keeps the controlled `<select>` from showing a value that is not in the list.
  // (External references):
  //   Dependency array `[clientOptions]`. Uses `setClientId` from [SearchBar.js, line 64].
  useEffect(() => {
    if (!clientOptions.length) return;
    setClientId((prev) =>
      clientOptions.some((c) => c.id === prev) ? prev : (clientOptions[0]?.id ?? ''),
    );
  }, [clientOptions]);

  // (Function meaning):
  //   `handleSubmit` runs when the form is submitted: prevent the browser’s default full-page reload, trim leading and trailing spaces from the search text, and if the parent passed `onSearch`, call it with the trimmed string and an object `{ clientId }` for the chosen client.
  // (External references):
  //   Bound to `<form onSubmit={handleSubmit}>`. `onSearch` is a prop on `SearchBar` [SearchBar.js, line 43].
  function handleSubmit(event) {
    // (Function meaning):
    //   `preventDefault()` tells the browser not to perform its normal form submit (which would reload the whole page in a classic HTML form).
    // (External references):
    //   The `submit` event from the `<form>` in the `return` of this function [SearchBar.js, lines 143–147].
    event.preventDefault();
    const trimmed = query.trim();
    // (Function meaning):
    //   Only call `onSearch` when it was passed in; calling an undefined value like a function would throw an error.
    // (External references):
    //   `onSearch` from the destructured props [SearchBar.js, line 43].
    if (onSearch) {
      onSearch(trimmed, { clientId });
    }
  }

  // (Function meaning):
  //   Return JSX: a `<form>` wrapping a client label and dropdown, a search label and text field, and a submit button with only an icon. Submit happens on Enter in the field or when the button is clicked.
  // (External references):
  //   `./SearchBar.css`; `FontAwesomeIcon` and `faMagnifyingGlass` imports [SearchBar.js, lines 21–26]; state and handlers defined above in this same `SearchBar` function.
  return (
    <form
      className="searchbar__form"
      role="search"
      aria-label="Site search"
      onSubmit={handleSubmit}
    >
      {/*
        (Function meaning):
          Visible label “Client to search” tied to the dropdown via `htmlFor` / `id`. The `<select>` shows the current `clientId` and updates it on change. It is disabled when `clientOptions` has length zero (no rows to pick).
        (External references):
          `clientOptions` [SearchBar.js, line 105]; `clientId` and `setClientId` [SearchBar.js, line 64].
      */}
      <label className="searchbar__label" htmlFor="landing-client-scope">
        Client to search
      </label>
      <div className="searchbar__client-field">
        <select
          id="landing-client-scope"
          className="searchbar__client"
          name="client"
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
          disabled={!clientOptions.length}
        >
          {clientOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <span className="searchbar__client-chevron" aria-hidden>
          <FontAwesomeIcon icon={faChevronDown} />
        </span>
      </div>
      {/*
        (Function meaning):
          Label “Search” linked to the text field. The field’s visible hint text uses `placeholder` from props (default `Search…` on [SearchBar.js, line 43]). Typed characters are stored in `query`.
        (External references):
          `placeholder` from props; `query` and `setQuery` from [SearchBar.js, line 59].
      */}
      <label className="searchbar__label" htmlFor="landing-site-search">
        Search
      </label>
      <input
        id="landing-site-search"
        className="searchbar__input"
        type="search"
        name="q"
        autoComplete="off"
        enterKeyHint="search"
        placeholder={placeholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {/*
        (Function meaning):
          Submit button with a magnifying-glass icon only. `aria-label` gives the button a spoken name for assistive tech because there is no visible text on the button.
        (External references):
          `FontAwesomeIcon` and `faMagnifyingGlass` from [SearchBar.js, lines 21–26].
      */}
      <button type="submit" className="searchbar__submit" aria-label="Submit search">
        <FontAwesomeIcon icon={faMagnifyingGlass} />
      </button>
    </form>
  );
}

// (Function meaning):
//   `export default SearchBar` means other files can import this component with `import SearchBar from '...path...'` without curly braces around the name.
// (External references):
//   For example `TopRibbon.js` imports this default export.
export default SearchBar;
