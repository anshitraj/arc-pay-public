import { Link } from "wouter";
import { Twitter } from "lucide-react";
import { SiGithub, SiDiscord } from "react-icons/si";

const footerLinks = {
  Product: [
    { label: "Payments", href: "/dashboard/payments" },
    { label: "Invoicing", href: "/dashboard/invoices" },
    { label: "Webhooks", href: "/docs#webhooks" },
    { label: "Pricing", href: "/pricing" },
  ],
  Developers: [
    { label: "Documentation", href: "/docs" },
    { label: "API Reference", href: "/docs#payments" },
    { label: "SDKs", href: "/docs#sdks" },
    { label: "Changelog", href: "/docs" },
  ],
  Company: [
    { label: "About", href: "/#about" },
    { label: "Blog", href: "/#blog" },
    { label: "Careers", href: "/#careers" },
    { label: "Contact", href: "/#contact" },
  ],
  Legal: [
    { label: "Privacy", href: "/#privacy" },
    { label: "Terms", href: "/#terms" },
    { label: "Security", href: "/docs" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/30" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4" data-testid="footer-logo">
              <img src="/arcpay.webp" alt="ArcPayKit" className="h-8" />
            </Link>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <span>Powered by</span>
              <img src="/arc.webp" alt="Arc" className="h-4 w-auto object-contain" />
            </div>
            <div className="flex gap-3">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover-elevate transition-colors"
                data-testid="link-twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover-elevate transition-colors"
                data-testid="link-github"
              >
                <SiGithub className="w-4 h-4" />
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover-elevate transition-colors"
                data-testid="link-discord"
              >
                <SiDiscord className="w-4 h-4" />
              </a>
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold text-sm mb-4">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      data-testid={`footer-link-${link.label.toLowerCase()}`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            2024 ArcPayKit. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
