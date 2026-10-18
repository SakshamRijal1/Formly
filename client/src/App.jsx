
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoutes";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import FormBuilder from "./pages/FormBuilder";
import PublicForm from "./pages/PublicForm";
import Responses from "./pages/Responses";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

import {
  Login,
  Register,
  VerifyEmail,
  ForgotPassword,
  ResetPassword,
} from "./pages/AuthPages";

function GuestRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={<GuestRoute><Login /></GuestRoute>}
      />
      <Route
        path="/register"
        element={<GuestRoute><Register /></GuestRoute>}
      />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Published forms are public */}
   {/* Published forms require login */}
<Route element={<ProtectedRoute />}>
  <Route path="/forms/:id" element={<PublicForm />} />
</Route>

      {/* Private workspace */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
      
          <Route path="/new" element={<NewFormRedirect />} />
          <Route path="/builder/:id" element={<FormBuilder />} />
          <Route path="/builder/:id/responses" element={<Responses />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function NewFormRedirect() {
  const { createNewForm } = useCreateFormNavigation();
  return createNewForm();
}

function useCreateFormNavigation() {
  // This helper is replaced below with a direct route component.
  return { createNewForm: () => <Navigate to="/" replace /> };
}
