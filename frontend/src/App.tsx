import { Layout, Menu } from "antd";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { ApplicationDetailPage } from "./pages/ApplicationDetailPage";

/** The familiar shape: top bar, a side nav with one item, and the current page. */
export function AppShell() {
  const navigate = useNavigate();
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ color: "#fff", fontWeight: 600, fontSize: 16 }}>
          TTB Label Check
        </div>
        {/* The user-menu corner stays empty — there are no users yet. */}
        <div />
      </Layout.Header>
      <Layout>
        <Layout.Sider theme="light" width={200}>
          <Menu
            mode="inline"
            selectedKeys={["applications"]}
            items={[{ key: "applications", label: "Applications" }]}
            onClick={() => navigate("/applications")}
          />
        </Layout.Sider>
        <Layout.Content style={{ padding: 24 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/applications" replace />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/applications/:id" element={<ApplicationDetailPage />} />
          </Routes>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
