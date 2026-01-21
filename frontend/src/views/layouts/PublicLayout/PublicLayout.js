import React from "react";
import { Outlet } from "react-router-dom";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";

const PublicLayout = () => {
    return (
        <div className="public-layout">
            <PublicHeader />

            <main className="public-content">
                <Outlet />
            </main>

            <PublicFooter />
        </div>
    );
};

export default PublicLayout;
