import React from 'react';

const AppFooter: React.FC = () => (
  <footer className="footer mt-auto py-6">
    <div className="container-app text-center">
      <p>Personal Progress Tracker &copy; {new Date().getFullYear()}</p>
    </div>
  </footer>
);

export default React.memo(AppFooter);
