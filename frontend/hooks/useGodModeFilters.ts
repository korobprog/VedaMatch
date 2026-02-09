import { useMemo } from 'react';
import { useUser } from '../context/UserContext';

export const useGodModeFilters = () => {
  const { user, godModeFilters, activeMathId, setActiveMath } = useUser();
  const safeFilters = godModeFilters || [];

  const activeMath = useMemo(
    () => safeFilters.find((f) => f.mathId === activeMathId) || safeFilters[0] || null,
    [activeMathId, safeFilters]
  );

  return {
    enabled: !!user?.godModeEnabled,
    filters: safeFilters,
    activeMath,
    activeMathId,
    setActiveMath,
  };
};
