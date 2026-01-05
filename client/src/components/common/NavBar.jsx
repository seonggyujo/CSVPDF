import { useLocation, useNavigate } from 'react-router-dom';
import SegmentedControl from './SegmentedControl';
import './NavBar.css';

function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const tabs = [
    { id: 'csv', label: 'CSV', path: '/csv' },
    { id: 'convert', label: 'Convert', path: '/convert' },
    { id: 'sign', label: 'Sign', path: '/sign' }
  ];

  const getActiveTab = () => {
    if (location.pathname === '/convert') return 'convert';
    if (location.pathname === '/sign') return 'sign';
    return 'csv';
  };

  const activeTab = getActiveTab();

  const handleTabChange = (tabId) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      navigate(tab.path);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <h1 className="navbar-title">Data Tools</h1>
        <SegmentedControl
          tabs={tabs}
          activeTab={activeTab}
          onChange={handleTabChange}
        />
      </div>
    </nav>
  );
}

export default NavBar;
