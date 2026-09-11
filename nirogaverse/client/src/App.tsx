import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import AyurVaaniPage from './pages/AyurVaaniPage';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter basename="/niro">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/modules/ayurvaani" replace />} />
          <Route path="modules/ayurvaani" element={<AyurVaaniPage />} />
          <Route path="*" element={<Navigate to="/modules/ayurvaani" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
