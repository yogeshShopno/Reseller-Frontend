import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Poppins } from "next/font/google";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export default function App({ Component, pageProps }: AppProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathName = usePathname()
  const isLoginPage = pathName === "/login";

  const getLabel = () => {
    if (pathName === "/") return "Dashboard"
    if (pathName === "/leads") return "Leads"
    if (pathName === "/leads/list") return "Leads List"
    if (pathName === "/leads/kanban") return "Leads Kanban"
    if (pathName === "/setup") return "Setup"
    if (pathName === "/tasks") return "Tasks"
    if (pathName === "/user-list") return "User"
    if (pathName === "/roles") return "Department Management"
    return ""
  }

  return (
    <div className={poppins.className}>
      <div className="flex min-h-screen bg-white">
        {!isLoginPage && (
          <Sidebar
            isOpen={isSidebarOpen}
            toggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          />
        )}
        <div
          className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${
            !isLoginPage ? (isSidebarOpen ? 'md:ml-64' : 'md:ml-20') : ''
          }`}
        >
          <main className="animate-in fade-in duration-300">
            {/* Only show header for non-login pages */}
            {!isLoginPage ? (
              <Header toggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />
            ) : null}
            <div className={isLoginPage ? "p-0" : "p-4 md:p-6"}>
              <Component {...pageProps} />
            </div>
          </main>
        </div>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
}