import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import GameContainer from './pages/GameContainer';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/war/:warId" element={<GameContainer />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
