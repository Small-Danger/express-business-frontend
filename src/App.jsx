import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import Layout from './components/shared/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Business/Clients';
import Products from './pages/Business/Products';
import Waves from './pages/Business/Waves';
import WavesHistory from './pages/Business/WavesHistory';
import WaveDetail from './pages/Business/WaveDetail';
import ConvoyDetail from './pages/Business/ConvoyDetail';
import ExpressWaves from './pages/Express/Waves';
import ExpressWavesHistory from './pages/Express/ExpressWavesHistory';
import ExpressWaveDetail from './pages/Express/ExpressWaveDetail';
import TripDetail from './pages/Express/TripDetail';
import Users from './pages/Admin/Users';
import Settings from './pages/Admin/Settings';
import Accounts from './pages/Treasury/Accounts';
import Transactions from './pages/Treasury/Transactions';
import Transfer from './pages/Treasury/Transfer';
import AccountDetail from './pages/Treasury/AccountDetail';

// Route publique pour la page de login
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Route publique - Login */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          
          {/* Routes protégées avec Layout */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Module Business */}
          <Route
            path="/business/clients"
            element={
              <ProtectedRoute requiredRoles={['admin', 'boss', 'secretary']}>
                <Layout>
                  <Clients />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/products"
            element={
              <ProtectedRoute requiredRoles={['admin', 'boss', 'secretary']}>
                <Layout>
                  <Products />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/waves"
            element={
              <ProtectedRoute requiredRoles={['admin', 'boss', 'secretary']}>
                <Layout>
                  <Waves />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/waves/history"
            element={
              <ProtectedRoute requiredRoles={['admin', 'boss', 'secretary']}>
                <Layout>
                  <WavesHistory />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/waves/:id"
            element={
              <ProtectedRoute requiredRoles={['admin', 'boss', 'secretary']}>
                <Layout>
                  <WaveDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/convoys/:id"
            element={
              <ProtectedRoute requiredRoles={['admin', 'boss', 'secretary']}>
                <Layout>
                  <ConvoyDetail />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Module Express */}
          <Route
            path="/express/waves"
            element={
              <ProtectedRoute requiredRoles={['admin', 'boss', 'secretary', 'traveler']}>
                <Layout>
                  <ExpressWaves />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/express/waves/history"
            element={
              <ProtectedRoute requiredRoles={['admin', 'boss', 'secretary', 'traveler']}>
                <Layout>
                  <ExpressWavesHistory />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/express/waves/:id"
            element={
              <ProtectedRoute requiredRoles={['admin', 'boss', 'secretary', 'traveler']}>
                <Layout>
                  <ExpressWaveDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/express/trips/:id"
            element={
              <ProtectedRoute requiredRoles={['admin', 'boss', 'secretary', 'traveler']}>
                <Layout>
                  <TripDetail />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Module Administration */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Layout>
                  <Users />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Module Trésorerie */}
          <Route
            path="/treasury/accounts"
            element={
              <ProtectedRoute requiredRoles={['admin', 'boss']}>
                <Layout>
                  <Accounts />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/treasury/transactions"
            element={
              <ProtectedRoute requiredRoles={['admin', 'boss']}>
                <Layout>
                  <Transactions />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/treasury/transfer"
            element={
              <ProtectedRoute requiredRoles={['admin', 'boss']}>
                <Layout>
                  <Transfer />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/treasury/accounts/:id"
            element={
              <ProtectedRoute requiredRoles={['admin', 'boss']}>
                <Layout>
                  <AccountDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Route par défaut - Rediriger vers dashboard si connecté, sinon login */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Route 404 - Rediriger vers dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

