import { AppShell } from "./components/AppShell";
import { EditProjectPage } from "./pages/EditProjectPage";
import { NewProjectPage } from "./pages/NewProjectPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { ProjectListPage } from "./pages/ProjectListPage";
import { useRoute, type Route } from "./router";

function renderRoute(route: Route) {
  switch (route.name) {
    case "list":
      return <ProjectListPage />;
    case "new":
      return <NewProjectPage />;
    // `key` remonta a página ao trocar de projeto, descartando estado e requisições antigas.
    case "detail":
      return <ProjectDetailPage key={route.id} id={route.id} />;
    case "edit":
      return <EditProjectPage key={route.id} id={route.id} />;
    case "not-found":
      return <NotFoundPage />;
  }
}

export default function App() {
  const route = useRoute();
  return <AppShell route={route}>{renderRoute(route)}</AppShell>;
}
