import { BrowserRouter, Routes, Route } from "react-router-dom";
import './App.css';
import RegisterPage from "./pages/RegisterPage.tsx";
import CalendarPage from './pages/CalendarPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import NotePage from './pages/NotePage.tsx';

function App()
{
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<LoginPage />} />
				<Route path="/NoteCards" element={<NotePage />} />
				<Route path="/register" element={<RegisterPage />} />
				<Route path="/calendar" element={<CalendarPage />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;

