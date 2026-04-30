/**
 * main.tsx — React application entry point.
 *
 * BEGINNER GUIDE:
 * This is the absolute starting point of our React application. 
 * Imagine this file as the key that turns the engine on. It takes our main 
 * <App /> component and attaches it to the empty <div id="root"> inside index.html.
 *
 * We do two special things here:
 * 1. We wrap everything in <QueryClientProvider>. This is a tool that helps us 
 *    fetch data from the internet (like property boundaries) and remembers it 
 *    so we don't have to download it twice.
 * 2. We deliberately do NOT use <React.StrictMode>. StrictMode is a testing tool 
 *    that runs code twice, which accidentally crashes our 3D map engine.
 */

import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

// Create a single QueryClient instance for the lifetime of the app.
// The default configuration (3 retries, 5-min staleTime) is suitable;
// individual hooks override these per-query as needed.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Suppress automatic background refetching when the window regains focus.
      // Parcel data is stable; we don't want to re-fetch mid-shadow-session.
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  // No <React.StrictMode> — see explanation above.
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
