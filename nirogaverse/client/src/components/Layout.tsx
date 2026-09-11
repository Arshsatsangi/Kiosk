import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useQueryClient } from '@tanstack/react-query';
import { useChatStore } from '../store/chatStore';
import { Leaf, LogOut, Stethoscope } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clearChat } = useChatStore();

  const handleLogout = () => {
    clearChat();
    queryClient.clear();
    logout();
    navigate('/login');
  };

  return (
    <div className="app-container">
      <nav className="nav">
        <div className="nav-content">
          <div className="nav-logo" onClick={() => navigate('/')}>
            <div className="nav-logo-icon">
              <Leaf size={18} />
            </div>
            Nirogaverse
          </div>

          <div className="nav-links">
            <NavLink to="/modules/ayurvaani" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Stethoscope size={16} /> AyurVaani
            </NavLink>
          </div>

          <div className="nav-user">
            <span className="nav-user-name">{user?.email}</span>
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

