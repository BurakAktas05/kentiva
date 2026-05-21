import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import SiteLayout from './components/SiteLayout';
import HomePage from './pages/HomePage';
import MunicipalityPage from './pages/MunicipalityPage';
import { inferMunicipalitySlugFromHostname } from './lib/tenantSite';

export default function App() {
  const municipalitySlugFromHost =
    typeof window !== 'undefined' ? inferMunicipalitySlugFromHostname(window.location.hostname) : null;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={municipalitySlugFromHost ? <MunicipalityPage fixedSlug={municipalitySlugFromHost} /> : <HomePage />} />
          <Route path="belediye/:slug" element={<MunicipalityPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
