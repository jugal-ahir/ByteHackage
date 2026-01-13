export const getBandColor = (roomNumber) => {
    const colors = {
        '004': { name: 'Red', hex: '#ef4444', bg: '#fee2e2' },
        '101': { name: 'Blue', hex: '#3b82f6', bg: '#dbeafe' },
        '102': { name: 'Green', hex: '#22c55e', bg: '#dcfce7' },
        '201': { name: 'Yellow', hex: '#eab308', bg: '#fef9c3' },
        '202': { name: 'Purple', hex: '#a855f7', bg: '#f3e8ff' },
        '301': { name: 'Orange', hex: '#f97316', bg: '#ffedd5' },
        '302': { name: 'Pink', hex: '#ec4899', bg: '#fce7f3' },
        // Default fallback
        'default': { name: 'Gray', hex: '#6b7280', bg: '#f3f4f6' }
    };

    return colors[roomNumber] || colors['default'];
};
