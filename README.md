# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Source code overview

High-level map of `src/` and what each part is responsible for.

| File / folder | Role |
|---------------|------|
| `index.js` | Application entry: mounts React to `#root`, wraps the tree in `StrictMode`, runs `reportWebVitals`. |
| `index.css` | Global styles (body reset, font stack, `code` styling). |
| `App.js` | Root component: wraps the current route or screen (e.g. unauthenticated landing). |
| `App.css` | Styles for the `.App` wrapper, if any. |
| `firebase.js` | Firebase app init and analytics; reads config from `REACT_APP_*` env vars. |
| `unAuth/Landing Page/` | **Landing screen**: composes the main layout (sidebar + content column). |
| `unAuth/Component/Layout/` | **Shell UI**: `NavBar`, `SearchBar`, `MainLanding`, `Footer` and their CSS. |
| `unAuth/Component/Layout/DynamicMain/` | **Main content region** for the landing layout (primary scroll/focus area as you extend it). |
| `unAuth/Component/Common/` | **Shared widgets** (e.g. `Button`) used across layout and future screens. |

**Layout flow:** `App` → `LandingPage` → a row with `NavBar` on the left and `landing-page__content` on the right. The content column stacks `SearchBar`, `MainLanding`, and `Footer`. Pair each `.js` file with its matching `.css` file for layout and appearance.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)