import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AdminPanel from './pages/AdminPanel';
import UserPanel from './pages/UserPanel';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="/play" element={<UserPanel />} />
    </Routes>
  );
}

export default App;
