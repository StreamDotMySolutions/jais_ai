import React from 'react';

const ListPageLayout = ({
    eyebrow,
    title,
    description,
    actions,
    filters,
    children,
    showCard = true,
    className = '',
}) => (
    <div className={`app-complaints ${className}`.trim()}>
        <div className="app-complaints-header">
            <div>
                {eyebrow && <span className="app-eyebrow">{eyebrow}</span>}
                <h3>{title}</h3>
                {description && <p>{description}</p>}
            </div>
            {actions && (
                <div className="app-complaints-actions">
                    {actions}
                </div>
            )}
        </div>
        {filters}
        {showCard ? (
            <div className="app-card app-complaints-card">
                {children}
            </div>
        ) : (
            children
        )}
    </div>
);

export default ListPageLayout;
