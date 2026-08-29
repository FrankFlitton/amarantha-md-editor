import { RouterProvider, usePath } from "./site/router";
import { SiteThemeProvider } from "./site/theme";
import { HomePage } from "./pages/HomePage";
import { ProductPage } from "./pages/ProductPage";
import { EcosystemPage } from "./pages/EcosystemPage";
import { ContactPage } from "./pages/ContactPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import "./App.css";

function Routes() {
  const path = usePath();
  switch (path) {
    case "/":
      return <HomePage />;
    case "/product":
      return <ProductPage />;
    case "/ecosystem":
      return <EcosystemPage />;
    case "/contact":
      return <ContactPage />;
    default:
      return <NotFoundPage />;
  }
}

function App() {
  return (
    <SiteThemeProvider>
      <RouterProvider>
        <Routes />
      </RouterProvider>
    </SiteThemeProvider>
  );
}

export default App;
