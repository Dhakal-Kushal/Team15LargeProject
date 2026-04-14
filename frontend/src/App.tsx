import { BrowserRouter, Routes, Route } from "react-router-dom";
import './App.css';
import RegisterPage from "./pages/RegisterPage.tsx";

import LoginPage from './pages/LoginPage.tsx';
import CardPage from './pages/CardPage.tsx';
import NotePage from './pages/NotePage.tsx';

function App()
{
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<NotePage />} />
				<Route path="/login" element={<LoginPage />} />
				<Route path="/register" element={<RegisterPage />} />
				<Route path="/cards" element={<CardPage />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;

