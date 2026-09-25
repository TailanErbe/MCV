import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Documents } from './pages/Documents';
import { DocumentView } from './pages/DocumentView';
import { LetterEditor } from './pages/LetterEditor';
import { PrebendaEditor } from './pages/PrebendaEditor';
import { ReceiptEditor } from './pages/ReceiptEditor';
import { Finance } from './pages/Finance';
import { IdCardPage } from './pages/IdCardPage';
import { Overview } from './pages/Overview';
import { People } from './pages/People';
import { PersonDetail } from './pages/PersonDetail';
import { Reports } from './pages/Reports';
import { SettingsPage } from './pages/SettingsPage';
import { StoreProvider } from './state/store';

// HashRouter: as rotas internas continuam funcionando ao recarregar em qualquer hospedagem estática.
export function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="financeiro" element={<Finance />} />
            <Route path="pessoas" element={<People />} />
            <Route path="pessoas/:id" element={<PersonDetail />} />
            <Route path="pessoas/:id/carteirinha" element={<IdCardPage />} />
            <Route path="documentos" element={<Documents />} />
            <Route path="documentos/carta/nova" element={<LetterEditor />} />
            <Route path="documentos/recibo-terreno/novo" element={<ReceiptEditor />} />
            <Route path="documentos/recibo-prebenda/novo" element={<PrebendaEditor />} />
            <Route path="documentos/:id" element={<DocumentView />} />
            <Route path="relatorios" element={<Reports />} />
            <Route path="configuracoes" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </StoreProvider>
  );
}
