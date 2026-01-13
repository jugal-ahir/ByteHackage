import React from 'react';

const Footer = () => {
    return (
        <footer style={{
            textAlign: 'center',
            padding: '16px',
            color: '#6b7280',
            fontSize: '0.875rem',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
            width: '100%',
            position: 'fixed',
            bottom: 0,
            left: 0,
            zIndex: 1000
        }}>
            <p style={{ margin: 0 }}>
                Developed with ❤️ by Jugal for Ingenium
            </p>
        </footer>
    );
};

export default Footer;
