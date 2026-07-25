import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import SiteLayout from './components/SiteLayout';
import HomePage from './pages/HomePage';
import MunicipalityPage from './pages/MunicipalityPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import ReportTrackPage from './pages/ReportTrackPage';
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
          <Route path="reports/track/:trackingNumber" element={<ReportTrackPage />} />
          <Route path="gizlilik-politikasi" element={<PrivacyPolicyPage />} />
          <Route path="kullanim-kosullari" element={<TermsOfServicePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
