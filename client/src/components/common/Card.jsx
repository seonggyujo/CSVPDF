import './Card.css';

function Card({ children, className = '', ...props }) {
  return (
    <div className={`ios-card ${className}`} {...props}>
      {children}
    </div>
  );
}

export default Card;
