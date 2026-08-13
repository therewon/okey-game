import { onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
import { database } from "../firebase/firebase";

interface RealtimeValue<T> {
  value: T | null;
  loading: boolean;
  denied: boolean;
}

export function useRealtimeValue<T>(path: string | null): RealtimeValue<T> {
  const [value, setValue] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    setValue(null);
    setDenied(false);
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading(true);

    return onValue(
      ref(database, path),
      (snapshot) => {
        setValue(snapshot.exists() ? snapshot.val() as T : null);
        setLoading(false);
      },
      () => {
        setDenied(true);
        setLoading(false);
      },
    );
  }, [path]);

  return { value, loading, denied };
}
