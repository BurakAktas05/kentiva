import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { TenantProvider } from './TenantContext.tsx';
import { initTokenStorage } from './lib/tokenStorage.ts';
import { initStorageService } from './lib/storageService.ts';

async function bootstrap() {
  await Promise.all([
    initStorageService(),
    initTokenStorage()
  ]);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <TenantProvider>
        <App />
      </TenantProvider>
    </StrictMode>,
  );
}

void bootstrap();
