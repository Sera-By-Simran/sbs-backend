export default function BackendIndex() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '600px' }}>
      <h2>SÉRA BY SIMRAN — Headless API (Backend)</h2>
      <p>This service provides internal APIs for the storefront and admin CMS.</p>
      <ul>
        <li><a href="/api/internal/v1/health">/api/internal/v1/health</a></li>
      </ul>
    </div>
  );
}
