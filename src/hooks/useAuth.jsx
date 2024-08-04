import { createContext, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalStorage } from "./useLocalStorage";
import { loginUserAsync } from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children, userData }) => {
  const [user, setUser] = useLocalStorage("user", userData);
  const navigate = useNavigate();

  const login = async (data) => {

    const loginResult = await loginUserAsync({
      username: data.email,
      password: data.password,
    });

    if (!data) {
      throw new Error("Unable to Login");
    }

    setUser(data);
    navigate("/dashboard/home", { replace: true });
  };

  const logout = () => {
    setUser(null);
    navigate("/", { replace: true });
  };

  const value = useMemo(
    () => ({
      user,
      login,
      logout
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
