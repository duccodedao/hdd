import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export const AuthActionRedirector = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  useEffect(() => {
    if (mode && oobCode && window.location.pathname !== '/auth/action') {
      navigate({
        pathname: '/auth/action',
        search: searchParams.toString()
      }, { replace: true });
    }
  }, [mode, oobCode, navigate, searchParams]);

  return null;
};
