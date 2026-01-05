import './SegmentedControl.css';

function SegmentedControl({ tabs, activeTab, onChange }) {
  return (
    <div className="segmented-control">
      <div className="segmented-control-bg">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            className={`segmented-control-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
            style={{
              '--index': index,
              '--total': tabs.length
            }}
          >
            {tab.label}
          </button>
        ))}
        <div
          className="segmented-control-slider"
          style={{
            width: `calc(${100 / tabs.length}% - 2px)`,
            transform: `translateX(${tabs.findIndex(t => t.id === activeTab) * 100}%)`
          }}
        />
      </div>
    </div>
  );
}

export default SegmentedControl;
