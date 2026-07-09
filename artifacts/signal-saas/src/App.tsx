import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import JoinPage from "@/pages/join";
import { VerifySearchPage, VerifyProfilePage } from "@/pages/verify";
import ContactPage from "@/pages/contact";
import { DisclaimerPage, TermsPage, PrivacyPage } from "@/pages/legal";

// VIA: disabled public pages — imports preserved for future reactivation
import ProductPage from "@/pages/product";
import SubscribeSuccessPage from "@/pages/subscribe-success";
import SubscribeCancelPage from "@/pages/subscribe-cancel";
import ShopPage from "@/pages/shop";
import ServicesPage from "@/pages/services";
import BookPage from "@/pages/book";
import GalleryPage from "@/pages/gallery";

import AdminLoginPage from "@/pages/admin/login";
import AdminDashboardPage from "@/pages/admin/dashboard";
import AdminSettingsPage from "@/pages/admin/settings";
import AdminActivityPage from "@/pages/admin/activity";
import AdminBusinessProfilePage from "@/pages/admin/business-profile";
import AdminLeadsPage from "@/pages/admin/leads";
import { AdminRoute, ModuleRoute } from "@/components/AdminRoute";

// VIA: disabled admin pages — imports preserved for future reactivation
import AdminProductsPage from "@/pages/admin/products";
import AdminProductFormPage from "@/pages/admin/product-form";
import AdminCategoriesPage from "@/pages/admin/categories";
import AdminCustomersPage from "@/pages/admin/customers";
import AdminAccessPage from "@/pages/admin/access";
import AdminAnalyticsPage from "@/pages/admin/analytics";
import AdminContentPage from "@/pages/admin/content";
import AdminMessagesPage from "@/pages/admin/messages";
import AdminTeamPage from "@/pages/admin/team";
import AdminServicesPage from "@/pages/admin/services";
import AdminBookingsPage from "@/pages/admin/bookings";
import AdminOrdersPage from "@/pages/admin/orders";
import AdminReviewsPage from "@/pages/admin/reviews";
import AdminGalleryPage from "@/pages/admin/gallery";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function Router() {
  return (
    <Switch>
      {/* ── VIA Public ───────────────────────────────────────── */}
      <Route path="/" component={HomePage} />
      <Route path="/join" component={JoinPage} />
      <Route path="/verify" component={VerifySearchPage} />
      <Route path="/verify/:viaNumber" component={({ params }) => <VerifyProfilePage viaNumber={params?.viaNumber ?? ""} />} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/disclaimer" component={DisclaimerPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />

      {/* ── VIA: disabled public routes (preserved, not linked in nav) ── */}
      <Route path="/shop" component={ShopPage} />                          {/* VIA: disabled */}
      <Route path="/services" component={ServicesPage} />                  {/* VIA: disabled */}
      <Route path="/book" component={BookPage} />                          {/* VIA: disabled */}
      <Route path="/gallery" component={GalleryPage} />                    {/* VIA: disabled */}
      <Route path="/products/:id" component={({ params }) => <ProductPage id={params?.id ?? ""} />} />  {/* VIA: disabled */}
      <Route path="/subscribe/success" component={SubscribeSuccessPage} />{/* VIA: disabled */}
      <Route path="/subscribe/cancel" component={SubscribeCancelPage} />  {/* VIA: disabled */}

      {/* ── Admin login ───────────────────────────────────────── */}
      <Route path="/admin/login" component={AdminLoginPage} />

      {/* ── Admin — always-on ─────────────────────────────────── */}
      <Route path="/admin">
        {() => <AdminRoute><AdminDashboardPage /></AdminRoute>}
      </Route>
      <Route path="/admin/business-profile">
        {() => <AdminRoute><AdminBusinessProfilePage /></AdminRoute>}
      </Route>
      <Route path="/admin/settings">
        {() => <ModuleRoute module="settings"><AdminSettingsPage /></ModuleRoute>}
      </Route>
      <Route path="/admin/activity">
        {() => <ModuleRoute module="activity"><AdminActivityPage /></ModuleRoute>}
      </Route>

      {/* ── Admin — VIA modules ───────────────────────────────── */}
      <Route path="/admin/leads">
        {() => <ModuleRoute module="leads"><AdminLeadsPage /></ModuleRoute>}
      </Route>

      {/* ── Admin — VIA: disabled routes (preserved, not in nav) ─ */}
      <Route path="/admin/products/new">
        {() => <ModuleRoute module="products"><AdminProductFormPage /></ModuleRoute>}
      </Route>
      <Route path="/admin/products/:id">
        {(params) => <ModuleRoute module="products"><AdminProductFormPage id={params?.id} /></ModuleRoute>}
      </Route>
      <Route path="/admin/products">
        {() => <ModuleRoute module="products"><AdminProductsPage /></ModuleRoute>}
      </Route>
      <Route path="/admin/categories">
        {() => <AdminRoute><AdminCategoriesPage /></AdminRoute>}
      </Route>
      <Route path="/admin/customers">
        {() => <ModuleRoute module="customers"><AdminCustomersPage /></ModuleRoute>}
      </Route>
      <Route path="/admin/access">
        {() => <ModuleRoute module="access"><AdminAccessPage /></ModuleRoute>}
      </Route>
      <Route path="/admin/analytics">
        {() => <ModuleRoute module="analytics"><AdminAnalyticsPage /></ModuleRoute>}
      </Route>
      <Route path="/admin/content">
        {() => <ModuleRoute module="content"><AdminContentPage /></ModuleRoute>}
      </Route>
      <Route path="/admin/messages">
        {() => <ModuleRoute module="messages"><AdminMessagesPage /></ModuleRoute>}
      </Route>
      <Route path="/admin/team">
        {() => <ModuleRoute module="team"><AdminTeamPage /></ModuleRoute>}
      </Route>
      <Route path="/admin/services">
        {() => <ModuleRoute module="services"><AdminServicesPage /></ModuleRoute>}
      </Route>
      <Route path="/admin/bookings">
        {() => <ModuleRoute module="bookings"><AdminBookingsPage /></ModuleRoute>}
      </Route>
      <Route path="/admin/orders">
        {() => <ModuleRoute module="orders"><AdminOrdersPage /></ModuleRoute>}
      </Route>
      <Route path="/admin/reviews">
        {() => <ModuleRoute module="reviews"><AdminReviewsPage /></ModuleRoute>}
      </Route>
      <Route path="/admin/gallery">
        {() => <ModuleRoute module="gallery"><AdminGalleryPage /></ModuleRoute>}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
