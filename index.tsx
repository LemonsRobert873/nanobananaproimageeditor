import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// @ts-ignore - Ignores missing type definition for png
import favicon from './banana.png';

// Dynamically set favicon to ensure the bundler includes the file
const setFavicon = (url: string) => {
  let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
};

setFavicon(favicon);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);