import type { ReactNode } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { ActiveVenueProvider } from "./lib/activeVenue";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { OrderPage } from "./pages/Order";
import { Display } from "./pages/Display";
import { AdminOrders } from "./pages/AdminOrders";
import { AdminMenu } from "./pages/AdminMenu";
import { AdminTables } from "./pages/AdminTables";
import { AdminSettings } from "./pages/AdminSettings";
import { AdminVenues } from "./pages/AdminVenues";

function RequireAuth({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/order" element={<OrderPage />} />
      <Route path="/display" element={<Display />} />
      <Route
        path="/admin/orders"
        element={
          <RequireAuth>
            <AdminOrders />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/menu"
        element={
          <RequireAuth>
            <AdminMenu />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/tables"
        element={
          <RequireAuth>
            <AdminTables />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <RequireAuth>
            <AdminSettings />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/venues"
        element={
          <RequireAuth>
            <AdminVenues />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ActiveVenueProvider>
          <AppRoutes />
        </ActiveVenueProvider>
      </AuthProvider>
    </HashRouter>
  );
}
