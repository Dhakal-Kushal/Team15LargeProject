import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./ThemeContext"; // Import this
import './App.css';
import RegisterPage from "./pages/RegisterPage.tsx";
import LoginPage from './pages/LoginPage.tsx';
import NotePage from './pages/NotePage.tsx';
import CalendarPage from './pages/CalendarPage.tsx';
import VerifyEmailPage from './pages/VerifyEmailPage.tsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.tsx';
import ResetPasswordPage from './pages/ResetPasswordPage.tsx';

function App()
{
	return (
		<ThemeProvider>
			<BrowserRouter>
				<Routes>
					<Route path="/" element={<NotePage />} />
					<Route path="/login" element={<LoginPage />} />
					<Route path="/NoteCards" element={<NotePage />} />
					<Route path="/register" element={<RegisterPage />} />
					<Route path="/calendar" element={<CalendarPage />} />
					<Route path="/verify" element={<VerifyEmailPage />} />
					<Route path="/forgot-password" element={<ForgotPasswordPage />} />
					<Route path="/reset-password" element={<ResetPasswordPage />} />
				</Routes>
			</BrowserRouter>
		</ThemeProvider>
	);
}
export default App;