import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const _login = useAuth();

  useEffect(() => {
    navigate('/farmer/dashboard');
  }, [navigate]);

  return null;
}

LoginPage.displayName = 'LoginPage';