/**
 * ============================================================
 *  THE ONE FILE TO EDIT.
 *  Every word on the site comes from here. Change a title,
 *  date, link or photo path in this file and the whole site
 *  (map, pipeline, recruiter mode, AI assistant) updates.
 * ============================================================
 *
 *  Photos: drop images into /public/photos/ using the file
 *  names referenced below. Missing photos show a neon placeholder.
 *
 *  Links: leave github/demo as "" until you have them — the
 *  buttons hide themselves automatically.
 */

export type Link = {
  github?: string; // source code
  demo?: string; // live site
  report?: string; // PDF write-up, e.g. "/docs/xeveora-report.pdf"
  devpost?: string; // hackathon submission page
  post?: string; // LinkedIn / blog write-up
};

/** One screenshot in a project's gallery. The first one is the card cover. */
export type Shot = { src: string; caption: string };

export type Project = {
  slug: string;
  name: string;
  tagline: string;
  period: string;
  status: "shipped" | "in-progress" | "academic";
  kind: "cloud" | "ai" | "app" | "web" | "data";
  badge?: string; // small callout, e.g. a hackathon
  stack: string[];
  bullets: string[];
  /** Big numbers shown in the case study. */
  metrics?: { value: string; label: string }[];
  /** "Problems I hit and how I fixed them" — recruiters love these. */
  challenges?: { problem: string; fix: string }[];
  links: Link;
  gallery: Shot[];
  featured?: boolean;
};

export type Role = {
  slug: string;
  company: string;
  title: string;
  type: string;
  period: string;
  location: string;
  bullets: string[];
  stack?: string[];
};

export const site = {
  name: "Syed Nabeel Raza",
  short: "Nabeel",
  katakana: "ナビール",
  domain: "yourdomain.dev", // TODO: replace once you buy the domain
  headline: "Software Developer — Cloud & AI",
  tagline:
    "I build cloud-native services and AI-powered products — and I've run the businesses that depend on them.",
  location: "Toronto, ON",
  status: "Open to junior developer, cloud & AI roles",
  email: "nabeelbukhari21@gmail.com",
  linkedin: "https://linkedin.com/in/syednr",
  github: "https://github.com/NabeelBukhari21",
  resumeUrl: "/resume.pdf", // drop your PDF at /public/resume.pdf
  photo: "/photos/profile.jpg",
};

/**
 * Social profiles for the "Open a Channel" hub. A card with an empty handle shows as
 * "not linked yet" instead of a broken link.
 */
export const socials = {
  instagram: { handle: "nabeelbukharii", url: "https://www.instagram.com/nabeelbukharii" },
  snapchat: { handle: "nabeelbukhariii", url: "https://www.snapchat.com/add/nabeelbukhariii", snapcode: "/character/snapcode.webp" },
  x: { handle: "nabeelbukhari_", url: "https://x.com/nabeelbukhari_" },
  facebook: { handle: "nabeelbukhariii", url: "https://www.facebook.com/nabeelbukhariii/" },
};

export const summary = [
  "Computer Programming & Analysis graduate (Seneca Polytechnic, CGPA 3.6) who builds on AWS, ships with CI/CD, and integrates LLMs and computer vision into real products.",
  "Before the code, I ran an e-commerce operation on Magento + MySQL with 1k+ SKUs — so I build software with the business on the other end in mind.",
];

export const experience: Role[] = [
  {
    slug: "notion-barn",
    company: "Notion Barn",
    title: "Web Developer",
    type: "Co-op",
    period: "Jan 2025 – Apr 2025",
    location: "Toronto, ON · On-site",
    bullets: [
      "Led a remote team of 5 developers based in India — assigning tasks, running check-ins across time zones and reviewing code to keep releases on schedule.",
      "Implemented Magento storefront updates: layout improvements, product page changes and bug fixes that improved the shopping experience.",
      "Modified and extended the codebase (PHP, JavaScript, HTML/CSS, theme templates) and delivered multiple releases while keeping the live site stable.",
    ],
    stack: ["Magento", "PHP", "JavaScript", "HTML/CSS", "Code review"],
  },
  {
    slug: "openpolicy",
    company: "OpenPolicy",
    title: "Associate Software Engineer",
    type: "Contract · Part-time",
    period: "Jan 2024 – Dec 2024",
    location: "Toronto, ON · Remote",
    bullets: [
      "Built and shipped front-end and back-end features and bug fixes from tickets in an agile workflow.",
      "Wrote clean, documented code; took part in code reviews and stand-ups; collaborated through Git and pull requests.",
      "Owned tasks from implementation through testing across a full year of contract work alongside full-time studies.",
    ],
    stack: ["JavaScript", "Python", "Git", "Agile"],
  },
  {
    slug: "grizzly-blades",
    company: "Grizzly Blades",
    title: "E-Commerce Manager",
    type: "Permanent · Part-time",
    period: "Jan 2024 – Dec 2024",
    location: "Markham, ON · On-site",
    bullets: [
      "Ran daily operations on Magento + MySQL across 1k+ SKUs; tuned the platform for reliability and held 99% order accuracy through monitoring and process controls.",
      "Analyzed sales and market data to grow online sales 18% and the customer base 25% in six months.",
      "Designed and deployed an AI agent that read, triaged and replied to customer-service emails, cutting response times.",
      "Built reporting workflows with vendors and presented weekly to stakeholders on revenue, ad spend and top products.",
    ],
    stack: ["Magento", "MySQL", "AI agents", "Analytics"],
  },
  {
    slug: "geniteam",
    company: "GenITeam Solutions",
    title: "Sales Intern",
    type: "Internship",
    period: "Aug 2022 – Apr 2023",
    location: "Lahore, Pakistan · On-site",
    bullets: [
      "Supported customer-acquisition and retention strategies across B2B and B2C, in person and by phone.",
    ],
  },
  {
    slug: "techinoid",
    company: "Techinoid",
    title: "Software Development Intern",
    type: "Internship",
    period: "Jul 2021 – Oct 2021",
    location: "Lahore, Pakistan · On-site",
    bullets: [
      "Implemented web-app features alongside senior developers and gained hands-on debugging and full-stack experience.",
    ],
  },
];

export const projects: Project[] = [
  {
    slug: "rentos",
    name: "RentOS",
    tagline: "An AI operating system for Toronto property management",
    period: "2026 – Present",
    status: "in-progress",
    kind: "app",
    featured: true,
    stack: ["SwiftUI", "MVVM", "Supabase", "Postgres", "Edge Functions", "LLMs"],
    bullets: [
      "Native iOS platform for landlords and property managers: properties, tenants, maintenance, documents, messaging and an AI operations copilot.",
      "Provider-agnostic AI layer — keys live server-side in a Supabase Edge Function, with ordered failover across providers and capability-based routing (no model names in the app).",
      "Every AI action that would change data must pass an approval gate and is written to an immutable audit log; prompts are never stored to protect tenant data.",
      "Layered architecture with dependency injection, async repositories, offline cache and a reusable design system built before any screen.",
    ],
    links: { github: "", demo: "" },
    gallery: [{ src: "/photos/rentos-1.jpg", caption: "" }, { src: "/photos/rentos-2.jpg", caption: "" }],
  },
  {
    slug: "insightboard",
    name: "InsightBoard AI",
    tagline: "Privacy-first classroom copilot: on-device vision + Gemini + long-term memory",
    period: "Feb 2026 – Mar 2026",
    status: "shipped",
    kind: "ai",
    badge: "Built for Google Antigravity Hackathon 2026",
    featured: true,
    stack: ["Next.js", "TypeScript", "React", "Tailwind", "MediaPipe", "Gemini API", "Backboard memory"],
    bullets: [
      "Detects confusion and disengagement live in the browser with MediaPipe: gaze, head pose, eye openness, movement, mouth activity and hand raises. No video ever leaves the device.",
      "Teachers upload their own .pptx deck; engagement is mapped slide by slide into timelines, dip analysis and a seating-zone heatmap, aggregated, never raw individual data.",
      "Gemini turns each student's weakest slides into a private recap, a worked example and a no-grades quick check, with 3D explainers for topics to review.",
      "Backboard long-term memory tracks patterns across sessions (e.g. the class repeatedly loses focus during backpropagation) and feeds Gemini teaching recommendations.",
    ],
    metrics: [
      { value: "7", label: "on-device signals tracked" },
      { value: "0", label: "video frames uploaded" },
      { value: "2", label: "dashboards: teacher + student" },
      { value: "5-step", label: "guided demo loop" },
    ],
    links: { github: "https://github.com/NabeelBukhari21/InsightBoardAI", demo: "" },
    gallery: [
      { src: "/projects/insightboard/01-home.webp", caption: "Landing page and the 5-step intelligence loop" },
      { src: "/projects/insightboard/02-hand-raise.webp", caption: "Live monitor: face + hand tracking detects a raised hand, on a real uploaded .pptx" },
      { src: "/projects/insightboard/03-distracted.webp", caption: "Looking away drops engagement to 19% and flags DISTRACTED in real time" },
      { src: "/projects/insightboard/04-speaking.webp", caption: "Mouth-activity signal marks the learner as speaking" },
      { src: "/projects/insightboard/05-session-timeline.webp", caption: "Session engagement timeline with privacy and signal-honesty panel" },
      { src: "/projects/insightboard/06-teacher-dashboard.webp", caption: "Teacher dashboard: biggest dip, peak slide and slide-by-slide breakdown" },
      { src: "/projects/insightboard/07-classroom-zones.webp", caption: "Before/after dip analysis and a seating-zone engagement heatmap" },
      { src: "/projects/insightboard/08-cross-session.webp", caption: "Cross-session trends from Backboard memory with a Gemini recommendation" },
      { src: "/projects/insightboard/09-student-hub.webp", caption: "Student's private view: their own engagement journey and highlights" },
      { src: "/projects/insightboard/10-gemini-recap.webp", caption: "Gemini-generated personal recap, worked example and quick check" },
      { src: "/projects/insightboard/11-judge-guide.webp", caption: "Judge guide explaining the product in five questions" },
    ],
  },
  {
    slug: "xeveora",
    name: "Xeveora Fragments",
    tagline: "Cloud-native microservice on AWS: API, storage, auth and CI/CD end to end",
    period: "Sep 2025 – Dec 2025",
    status: "shipped",
    kind: "cloud",
    featured: true,
    stack: ["Node.js", "Express", "Docker", "AWS ECS", "ALB", "ECR", "Cognito", "S3", "DynamoDB", "CloudWatch", "GitHub Actions", "Jest", "Hurl", "LocalStack"],
    bullets: [
      "Built the Fragments REST API (Express, Helmet, Pino, Passport) with full CRUD and on-the-fly format conversion across text, Markdown, HTML, JSON and images (Sharp), returning clean 415s for invalid conversions.",
      "Wrote a pluggable storage layer: in-memory for development, DynamoDB for metadata plus S3 for binary data in production, switched by environment config.",
      "Deployed on AWS ECS behind an Application Load Balancer, images in ECR, logs in CloudWatch, sign-in through the Cognito Hosted UI (OIDC code flow, JWT bearer auth).",
      "CI runs lint, Jest unit tests and Hurl integration tests against Docker Compose + LocalStack + DynamoDB Local on every commit; a git tag triggers CD that pushes to ECR and rolls out a new ECS task definition.",
      "Shipped a cyberpunk-themed frontend (Parcel, oidc-client-ts) to create, upload, preview, convert, update and delete fragments against the live API.",
    ],
    metrics: [
      { value: "87%", label: "statement test coverage" },
      { value: "10/10", label: "integration suites passing" },
      { value: "22", label: "unit tests, all green" },
      { value: "6-step", label: "tag-triggered deploy to ECS" },
    ],
    challenges: [
      { problem: "ALB health checks kept failing", fix: "Recreated the target group with IP targets on port 8080 and path /; healthy immediately." },
      { problem: "The ECS instance was publicly exposed", fix: "Locked down security groups: ALB open on port 80, ECS reachable only from the ALB's security group." },
      { problem: "CD deploys failed on missing session tokens", fix: "Fixed the GitHub Actions secret names and rotated in fresh credentials." },
      { problem: "Cognito JWKS verification timed out on ECS", fix: "Traced it with better logging to the sandbox blocking outbound internet, and validated the full JWT flow end to end from the UI." },
    ],
    links: {
      github: "https://github.com/NabeelBukhari21/CCP555-2025F-NSC-Syed-Raza-SNRAZA-ASSIGNMENT-3",
      report: "/docs/xeveora-report.pdf",
    },
    gallery: [
      { src: "/projects/xeveora/01-home.webp", caption: "Xeveora UI: Cognito OIDC sign-in with token inspector" },
      { src: "/projects/xeveora/02-cognito-login.webp", caption: "Custom-branded Amazon Cognito Hosted UI" },
      { src: "/projects/xeveora/03-fragments.webp", caption: "Your fragments: list, view, edit, delete with live preview" },
      { src: "/projects/xeveora/04-create.webp", caption: "Create text, JSON and Markdown fragments against the live API" },
      { src: "/projects/xeveora/05-update.webp", caption: "Update a fragment via PUT /v1/fragments/:id" },
      { src: "/projects/xeveora/06-ecs-service.webp", caption: "ECS service healthy behind the Application Load Balancer" },
      { src: "/projects/xeveora/07-alb.webp", caption: "ALB resource map: listener → rule → target group → healthy target" },
      { src: "/projects/xeveora/08-ci.webp", caption: "CI: unit tests, Docker Compose, LocalStack + DynamoDB Local, Hurl" },
      { src: "/projects/xeveora/09-cd.webp", caption: "CD: build, push to ECR, render task definition, deploy to ECS" },
      { src: "/projects/xeveora/10-integration-tests.webp", caption: "10/10 Hurl integration suites passing" },
      { src: "/projects/xeveora/11-coverage.webp", caption: "Jest coverage report: 87% statements" },
      { src: "/projects/xeveora/12-ecr.webp", caption: "Versioned images in Amazon ECR" },
    ],
  },
  {
    slug: "grizzly-ecom",
    name: "Grizzly Blades E-Commerce",
    tagline: "E-commerce operations for a Canadian handmade-knife brand on Magento 2",
    period: "Jan 2024 – Dec 2024",
    status: "shipped",
    kind: "data",
    stack: ["Magento 2", "MySQL", "Google Shopping ads", "PayPal", "Yotpo", "AI agents"],
    bullets: [
      "Ran daily store operations on Magento 2 + MySQL across 1k+ SKUs: catalog, orders and fulfillment for handmade Damascus knives, axes and kitchen sets.",
      "Analyzed sales and market data; online sales grew 18% and the customer base 25% in six months.",
      "Reviewed weekly Google Shopping reports with our ads agency and presented revenue, ad spend and top products to the owner.",
      "Built an AI agent that read, triaged and answered customer-service emails, cutting response times.",
    ],
    // From the agency report for the week of Nov 25 – Dec 1, 2024
    metrics: [
      { value: "10×", label: "ROAS, week of Nov 25, 2024" },
      { value: "$7,407", label: "ad-driven revenue that week" },
      { value: "56", label: "products sold that week" },
      { value: "2.68%", label: "conversion rate that week" },
    ],
    links: { demo: "https://grizzlyblades.com" },
    gallery: [
      { src: "/projects/grizzly/01-home.webp", caption: "grizzlyblades.com storefront (as it looks today)" },
      { src: "/projects/grizzly/07-weekly-report-nov-2024.webp", caption: "Agency weekly Google Shopping report, Nov 25 – Dec 1, 2024, that I reviewed and presented" },
      { src: "/projects/grizzly/08-dashboard.webp", caption: "Magento dashboard, Jan 2024: revenue and top customers (names blurred)" },
      { src: "/projects/grizzly/04-product.webp", caption: "Product page with engraving and rosewood-box add-ons" },
      { src: "/projects/grizzly/05-wholesale.webp", caption: "Cart with personalization options and wholesale coupon tiers" },
      { src: "/projects/grizzly/06-personalization.webp", caption: "Order line item with a paid engraving option" },
      { src: "/projects/grizzly/02-mobile.webp", caption: "Mobile storefront (today)" },
      { src: "/projects/grizzly/03-shop.webp", caption: "Shop-all catalog (today)" },
    ],
  },
  {
    slug: "handouts",
    name: "Handouts",
    tagline: "AI mutual-aid marketplace that matches neighbours' surplus with scarcity",
    period: "Nov 2025",
    status: "shipped",
    kind: "ai",
    badge: "Sheridan Datathon 2025 · team of 5",
    stack: ["React", "TypeScript", "Vite", "Gemini API", "BigQuery", "Google Cloud Run"],
    bullets: [
      "Built in a hackathon weekend with a team of five; I owned the BigQuery data layer and backend work.",
      "Neighbours post a need or an offer in seconds; Gemini turns free text into category, urgency and location, or writes the post for them.",
      "Community marketplace of needs and offers with urgency levels, distance and category filters, and one-tap “I need this” / “I want to help”.",
      "Community Pulse dashboard on BigQuery: active needs, offers, matches, activity trends, top categories and Gemini-written forecasts.",
      "Points, levels and badges reward helping; deployed on Google Cloud Run.",
    ],
    links: {
      github: "https://github.com/NabeelBukhari21/Handouts",
      demo: "https://copy-of-handouts-368450292826.us-west1.run.app",
      devpost: "https://devpost.com/software/handouts",
    },
    gallery: [
      { src: "/projects/handouts/01-home.webp", caption: "“Connecting communities, one handout at a time”" },
      { src: "/projects/handouts/02-need-or-help.webp", caption: "Two paths: I need this / I want to help" },
      { src: "/projects/handouts/03-request.webp", caption: "Request flow with category, urgency and “Let AI write it”" },
      { src: "/projects/handouts/04-offer.webp", caption: "Offer flow with Gemini tips and pickup windows" },
      { src: "/projects/handouts/05-marketplace.webp", caption: "Community marketplace of needs and offers" },
      { src: "/projects/handouts/06-want-to-help.webp", caption: "One tap to help with a need" },
      { src: "/projects/handouts/07-need-this.webp", caption: "One tap to claim an offer" },
      { src: "/projects/handouts/08-insights.webp", caption: "Community Pulse: BigQuery stats + Gemini analysis" },
      { src: "/projects/handouts/09-profile.webp", caption: "Profile with points, badges and activity history" },
    ],
  },
  {
    slug: "bbq-revival",
    name: "True North BBQ Revival",
    tagline: "Full-stack booking platform for a BBQ cleaning service, with client, technician and partner portals",
    period: "Winter 2026",
    status: "shipped",
    kind: "app",
    badge: "Seneca PRJ666 capstone · team of 3",
    stack: ["Next.js", "React", "Supabase", "PostgreSQL", "Supabase Auth"],
    bullets: [
      "Built as a real product: a friend who runs a BBQ cleaning business in Alberta plans to use it.",
      "End-to-end booking with real-time availability and pricing, Supabase Auth with password reset, and email confirmations.",
      "Three role-based portals: clients manage bookings, technicians claim, start and complete jobs, and manufacturer partners track referrals.",
      "Referral-code system with usage tracking and conversion analytics on the partner dashboard.",
      "Everything is connected: bookings → jobs → technicians → reviews → analytics, with reviews tied to completed bookings rather than mock data.",
    ],
    challenges: [
      { problem: "Double bookings and data-consistency edge cases", fix: "Designed relational data models in PostgreSQL that keep bookings, jobs and reviews consistent." },
      { problem: "Dashboards built on mock values", fix: "Moved the homepage, reviews and contact form onto live database data." },
      { problem: "Three user types with different permissions", fix: "Built role-based dashboards with access control for clients, technicians and partners." },
    ],
    links: { post: "https://www.linkedin.com/feed/update/urn:li:activity:7452785667438268416/" },
    gallery: [
      { src: "/projects/bbq/01-home.webp", caption: "Homepage: “The Art of Fire & Steel”" },
      { src: "/projects/bbq/02-before-after.webp", caption: "Interactive before/after slider and how-it-works steps" },
      { src: "/projects/bbq/03-services.webp", caption: "Residential and commercial service tiers" },
      { src: "/projects/bbq/04-booking.webp", caption: "Booking flow with slot selection and referral codes" },
      { src: "/projects/bbq/05-payment-success.webp", caption: "Payment confirmation with technician matching" },
      { src: "/projects/bbq/06-sign-in-roles.webp", caption: "Sign-in for three roles: client, technician, partner" },
      { src: "/projects/bbq/07-technician-dashboard.webp", caption: "Technician HQ: earnings, jobs and schedule (client details blurred)" },
      { src: "/projects/bbq/08-partner-dashboard.webp", caption: "Manufacturer partner dashboard with referral analytics (names blurred)" },
      { src: "/projects/bbq/09-contact.webp", caption: "Contact page storing submissions in the database" },
    ],
  },
  {
    slug: "criticalminers",
    name: "Critical Miners Group",
    tagline: "Freelance website for a Canada-based mining advisory firm",
    period: "Early 2026",
    status: "shipped",
    kind: "web",
    badge: "Freelance client project",
    stack: ["React", "TypeScript", "Vite", "Tailwind", "shadcn/ui", "Supabase", "Lovable (AI-assisted)", "GoDaddy", "cPanel"],
    bullets: [
      "Designed and built the full site for an independent mining advisory firm working with international operators in Pakistan.",
      "Seven main pages (home, about, services, Pakistan focus, ESG & community, engagement model, contact) plus privacy and terms.",
      "Detailed service-proposal request form so prospective clients can brief the firm in one step.",
      "Light/dark theme toggle and a dark industrial look with a copper accent that matches the brand.",
      "Set up the custom domain, GoDaddy hosting and branded business email through cPanel.",
    ],
    links: { demo: "https://www.criticalminers.com" },
    gallery: [
      { src: "/projects/criticalminers/01-home.webp", caption: "Homepage: “Your strategic partner for complex mining markets”" },
      { src: "/projects/criticalminers/02-services.webp", caption: "Services page" },
      { src: "/projects/criticalminers/03-pakistan.webp", caption: "Pakistan Focus page" },
      { src: "/projects/criticalminers/04-contact.webp", caption: "Contact page with service-proposal request form" },
    ],
  },
  {
    slug: "zensalt",
    name: "ZEN SALT",
    tagline: "Bilingual (EN/FR) website for a Himalayan salt-stone design & installation studio",
    period: "2026",
    status: "shipped",
    kind: "web",
    badge: "Freelance client project",
    stack: ["TanStack Start", "React", "TypeScript", "Bun", "Web3Forms", "Lovable (AI-assisted)", "GoDaddy", "cPanel"],
    bullets: [
      "Designed and built a one-page luxury site for a studio that supplies, designs and installs illuminated Himalayan salt-stone walls.",
      "Full English/French language switch for English- and French-speaking clients.",
      "Story, craft, spaces, process, gallery and contact sections with scroll-triggered reveals and a warm editorial look.",
      "Contact form delivered through Web3Forms; favicons, web manifest and social-share image generated from the brand mark.",
      "Set up the custom domain, GoDaddy hosting and branded business email through cPanel.",
    ],
    links: { demo: "https://zensalt.ca" },
    gallery: [
      { src: "/projects/zensalt/01-home.webp", caption: "Homepage: “Warmth, carved from salt.”" },
      { src: "/projects/zensalt/02-french.webp", caption: "Same page in French via the EN/FR toggle" },
      { src: "/projects/zensalt/03-craft.webp", caption: "Our Craft section" },
      { src: "/projects/zensalt/04-spaces.webp", caption: "Places we transform" },
      { src: "/projects/zensalt/05-gallery.webp", caption: "Project gallery" },
    ],
  },
  {
    slug: "ai-support-agent",
    name: "AI Support Agent",
    tagline: "Email triage agent for a live e-commerce business",
    period: "2024",
    status: "shipped",
    kind: "ai",
    stack: ["LLM", "Email automation", "Workflow design"],
    bullets: [
      "Automatically read, triaged and replied to customer-service emails at Grizzly Blades.",
      "Cut response times and freed the team to focus on complex customer issues.",
    ],
    links: {},
    gallery: [],
  },
  {
    slug: "maxdal",
    name: "MaxDal Leather",
    tagline: "Premium Shopify storefront for a Canadian leather-goods brand",
    period: "Early 2026",
    status: "shipped",
    kind: "web",
    stack: ["Shopify", "E-commerce", "UX design", "Mobile-first", "Branding"],
    bullets: [
      "Designed and built a storefront that feels premium the moment it opens: a minimal black-and-titanium theme across belts, wallets, bags, briefcases and accessories.",
      "Focused on smooth product browsing, a clean checkout flow and mobile-first performance.",
      "Built the trust layer that converts visitors: refund, shipping and privacy pages, with support and shipping promises up front.",
      "Treated design, performance and branding as one system, because small details decide whether a visitor becomes a customer.",
      "Completed the build and handed the store over to the client.",
    ],
    links: {},
    gallery: [{ src: "/projects/maxdal/01-home.webp", caption: "MaxDal Leather homepage: “Luxury built to hold its shape”" }],
  },
  {
    slug: "robotics",
    name: "Autonomous Robot Navigation",
    tagline: "Sensor-driven autonomy for a VEX robot in RobotC, tested in Robot Virtual Worlds — SDR 520, Software Design for Robotics Applications (A+)",
    period: "Sep 2025 – Dec 2025",
    status: "academic",
    kind: "app",
    stack: ["RobotC", "C", "VEX", "Robot Virtual Worlds", "Sonar", "Gyroscope"],
    bullets: [
      "Programmed a robot to sweep its sonar across a 90° arc, keep the closest valid reading, turn to it with the gyro and drive until it reaches a stopping distance.",
      "Approach logic slows the robot down before stopping, rather than braking at full speed.",
      "Logged every step to the debug stream (raw distances, scan results, mode changes) to trace and tune the robot's decisions.",
      "Built the test arena in Robot Virtual Worlds Level Builder with start, checkpoint and stop tiles and obstacles.",
    ],
    links: {},
    gallery: [
      { src: "/projects/robotics/01-sonar-scan.webp", caption: "Sonar sweep finds the closest object (44°, 1494 mm), turns and drives to it — debug log on the right" },
      { src: "/projects/robotics/02-approach-stop.webp", caption: "Approach mode: slows and stops once within the target distance" },
      { src: "/projects/robotics/03-level-builder.webp", caption: "Test arena built in Robot Virtual Worlds Level Builder" },
    ],
  },
  {
    slug: "hotel",
    name: "Hotel Management System",
    tagline: "Self-service guest kiosk + staff dashboard in JavaFX",
    period: "Sep 2025 – Dec 2025",
    status: "academic",
    kind: "app",
    stack: ["Java 17", "JavaFX / FXML", "Hibernate / JPA", "H2", "Google Guice", "Log4j 2"],
    bullets: [
      "Guest kiosk with a guided booking wizard: stay dates, occupancy, a suggested room plan from capacity rules, add-ons, guest details, review and a PDF receipt.",
      "Staff dashboard for reservations, payments, checkout, waitlist, loyalty, feedback analysis, revenue and occupancy reports and activity logs, with CSV/TXT export.",
      "3-tier architecture (JavaFX controllers → service layer → Hibernate repositories) wired together with Google Guice dependency injection.",
      "Design patterns where they earn their keep: Observer keeps the dashboard live, Strategy swaps billing and discount rules at runtime, Factory builds rooms, and a DI-managed singleton carries booking state through the wizard.",
    ],
    metrics: [
      { value: "7", label: "JPA entities with mapped relationships" },
      { value: "8", label: "admin dashboard modules" },
      { value: "4", label: "design patterns applied" },
      { value: "3", label: "tiers: UI → service → repository" },
    ],
    challenges: [
      { problem: "Booking state leaked across wizard screens and coupled the controllers", fix: "Introduced a shared BookingContext, injected by Guice as a singleton." },
      { problem: "The dashboard went stale after bookings, cancellations and checkouts", fix: "Built an Observer: AvailabilityNotifier pushes changes to every subscribed view." },
      { problem: "One admin controller grew to handle every tab", fix: "Grouped logic by feature; the next step is one controller per tab via <fx:include>." },
    ],
    links: { github: "", report: "/docs/hotel-report.pdf" },
    gallery: [
      { src: "/projects/hotel/01-splash.webp", caption: "Launch screen" },
      { src: "/projects/hotel/02-welcome.webp", caption: "Kiosk welcome: book, sign in or leave feedback" },
      { src: "/projects/hotel/03-sign-in.webp", caption: "Guest, user and admin sign-in with role enforcement" },
      { src: "/projects/hotel/04-dates.webp", caption: "Booking wizard: stay dates validated instantly" },
      { src: "/projects/hotel/05-room-plan.webp", caption: "Suggested room plan from occupancy and capacity rules" },
      { src: "/projects/hotel/06-add-ons.webp", caption: "Add-ons with live price and loyalty summary" },
      { src: "/projects/hotel/07-guest-info.webp", caption: "Guest details with loyalty-program opt-in" },
      { src: "/projects/hotel/08-review.webp", caption: "Review and confirm with estimated charges" },
      { src: "/projects/hotel/09-confirmation.webp", caption: "Booking confirmation with PDF receipt" },
      { src: "/projects/hotel/10-feedback.webp", caption: "Guest feedback form" },
      { src: "/projects/hotel/11-admin-reservations.webp", caption: "Admin: reservation search and management" },
      { src: "/projects/hotel/12-admin-payments.webp", caption: "Admin: payments, deposits, refunds and discounts" },
      { src: "/projects/hotel/13-admin-feedback.webp", caption: "Admin: feedback analysis with sentiment filters" },
      { src: "/projects/hotel/14-admin-reports.webp", caption: "Admin: revenue and occupancy reporting" },
    ],
  },
  {
    slug: "legoland",
    name: "LegoLand Website",
    tagline: "Full-stack app on relational + NoSQL databases",
    period: "Jun 2024 – Aug 2024",
    status: "academic",
    kind: "data",
    stack: ["Node.js", "Express", "PostgreSQL", "MongoDB", "Tailwind"],
    bullets: [
      "Integrated PostgreSQL and MongoDB behind a shared backend — schema design, tuned SQL queries and authentication.",
      "Responsive, mobile-friendly front end.",
    ],
    links: { github: "", demo: "" },
    gallery: [{ src: "/photos/legoland-1.jpg", caption: "" }],
  },
];

export const skills = {
  Cloud: ["AWS (EC2, S3, IAM, ECS, Cognito)", "Docker", "GitHub Actions", "CI/CD", "Linux", "Supabase"],
  "AI & ML": ["LLM integration (Gemini)", "AI agents", "MediaPipe / computer vision", "Prompt design"],
  Data: ["SQL", "PostgreSQL", "MySQL", "Oracle", "MongoDB", "DynamoDB", "Schema design", "Query optimization"],
  Development: ["TypeScript", "JavaScript", "Python", "Java", "Swift / SwiftUI", "C/C++", "Node.js", "React", "Next.js", "REST APIs"],
  Practices: ["Agile / Jira", "Code review", "Git & PRs", "Production support", "Technical documentation"],
};

export const education = [
  {
    school: "Seneca Polytechnic",
    credential: "Computer Programming & Analysis — Advanced Diploma",
    period: "Sep 2023 – May 2026",
    location: "Toronto, ON",
    notes: ["CGPA 3.6", "President's Honour List — Winter 2024 (GPA 3.9)", "Vice President, Pakistan Students Association"],
  },
  {
    school: "FAST NUCES",
    credential: "BS Artificial Intelligence (2 semesters)",
    period: "2022 – 2023",
    location: "Islamabad, Pakistan",
    notes: [],
  },
  {
    school: "Aitchison College",
    credential: "O & A Levels",
    period: "– 2021",
    location: "Lahore, Pakistan",
    notes: ["School Prefect", "Rugby Captain", "Boarding House Prefect"],
  },
];

export const ventures: {
  name: string;
  role: string;
  period: string;
  url: string;
  stats: { value: string; label: string }[];
  highlights: string[];
  gallery: Shot[];
}[] = [
  {
    name: "HimalayanZenSalt",
    role: "Founder & Owner",
    period: "Jan 2025 – Present",
    url: "https://www.etsy.com/shop/HimalayanZenSalt",
    // Numbers as shown on Etsy, Oct 2026 — update occasionally
    stats: [
      { value: "231", label: "Etsy sales" },
      { value: "4.8★", label: "38 reviews" },
      { value: "59", label: "listings" },
    ],
    highlights: [
      "Built the brand from zero: sourcing, product photography, SEO-optimized listings and pricing",
      "Hand-carved Himalayan salt lamps and decor, shipped across Canada from Toronto",
      "Expanded to Amazon as a second sales channel (100+ sales)",
    ],
    gallery: [
      { src: "/ventures/hzs-store.webp", caption: "The HimalayanZenSalt storefront on Etsy" },
      { src: "/ventures/hzs-1.webp", caption: "Natural Himalayan salt lamp" },
      { src: "/ventures/hzs-2.webp", caption: "Heart-shaped hand-carved salt lamp" },
      { src: "/ventures/hzs-3.webp", caption: "Fire bowl salt lamp" },
      { src: "/ventures/hzs-4.webp", caption: "Eagle-shaped hand-carved salt lamp" },
      { src: "/ventures/hzs-ddp.webp", caption: "Setting up duty-paid (DDP) cross-border shipping for the catalog" },
    ],
  },
  {
    name: "MariasCollectionCA",
    role: "Etsy Shop Manager",
    period: "May 2025 – Apr 2026",
    url: "https://www.etsy.com/ca/shop/MariasCollectionCA",
    stats: [
      { value: "~800 → 3k", label: "total sales while managing" },
      { value: "4.9★", label: "1k+ reviews · Star Seller" },
      { value: "234", label: "handcrafted listings" },
    ],
    highlights: [
      "Grew total shop sales from ~800 to 3,000 (~275%) in under a year",
      "Ran paid Etsy ads with weekly spend, revenue and ROI reporting",
      "Managed listings, personalization orders and customer service for handcrafted rosewood goods",
    ],
    gallery: [
      { src: "/ventures/mc-store.webp", caption: "The MariasCollectionCA storefront: Star Seller, 4.9★" },
      { src: "/ventures/mc-1.webp", caption: "Personalized engraved rosewood spoon set" },
      { src: "/ventures/mc-2.webp", caption: "Handmade carved rosewood walking cane" },
      { src: "/ventures/mc-3.webp", caption: "Hand-carved wooden keepsake box" },
    ],
  },
];

/** Hidden behind the terminal command `sidequests` or the Konami code. */
export const sideQuests = [
  { title: "Overnight Associate", org: "The Home Depot, Yorkdale", period: "2026 – Present", note: "Monthly Associate Award" },
  { title: "Sales Manager", org: "Active Market Place, Ajax", period: "Oct 2023 – Aug 2025", note: "5 booths, 90–150+ customers a day" },
  { title: "Sales Associate", org: "Notion Barn", period: "Sep 2023 – Aug 2025", note: "Retail, phone and online service" },
  { title: "Line Cook", org: "THG's Hot Chicken, Toronto", period: "Sep 2023 – Jan 2024", note: "High-volume rushes, HACCP" },
  { title: "Personal Trainer & Coach", org: "Freelance, Lahore & Islamabad", period: "Jan 2021 – Dec 2022", note: "Programs + nutrition plans" },
];

/** The RPG "Character Select" section. Stats are for fun; achievements and photos are real. */
/** `vault`: the real photo lives encrypted in the vault (vault-src/arcs/<name>); `src` is only a blurred stand-in */
export type Proof = Shot & { video?: string; vault?: string };
export const character = {
  className: "Cloud Mage / Full-Stack Ronin",
  origin: "Lahore → Islamabad → Toronto",
  /** selectable "costumes" for the character portrait */
  costumes: [
    { key: "now", label: "Toronto · now", src: "/character/me-park.webp", pos: "50% 30%" },
    { key: "aitchison", label: "Aitchison · 2021", src: "/character/me-uniform.webp", pos: "50% 4%" },
    { key: "rugby", label: "Rugby · 2018–19", src: "/character/medal-bite.webp", pos: "50% 25%" },
  ],
  stats: [
    { key: "INT", label: "Systems thinking", value: 88 },
    { key: "STR", label: "Rugby captain energy", value: 92 },
    { key: "CHA", label: "Sells what he builds", value: 90 },
    { key: "DEX", label: "Ships fast (vibe codes daily)", value: 86 },
    { key: "WIS", label: "Runs real businesses", value: 80 },
    { key: "VIT", label: "6+ years natural training", value: 94 },
  ],
  arcs: [
    {
      name: "The Aitchison Arc",
      years: "2016 – 2021",
      text: "Boarding house leader at Leslie Jones (LJ) House, school prefect, student council, rugby captain. Learned to lead people before learning to lead code.",
      image: "/character/old-building.webp",
      gallery: [
        { src: "/character/old-building.webp", caption: "Aitchison College, in front of the old building" },
        { src: "/character/portrait-arch.webp", caption: "Aitchison College" },
        { src: "/character/aitchison.webp", caption: "Aitchison College, Lahore" },
        { src: "/character/lj-flag.webp", caption: "Leslie Jones (LJ) House flag and the house trophies" },
        { src: "/character/lj-housemaster.webp", caption: "LJ House leaders with the House Master" },
        { src: "/character/lj-full-house.webp", caption: "The whole of LJ House" },
        { src: "/character/assembly.webp", caption: "Formal assembly" },
        { src: "/character/locked/aitchison-with-dad.webp", caption: "With my dad", vault: "aitchison-with-dad.webp" },
        { src: "/character/locked/aitchison-amphitheatre.webp", caption: "Friends in the amphitheatre", vault: "aitchison-amphitheatre.webp" },
        { src: "/character/uniform.webp", caption: "In uniform on the fields" },
        { src: "/character/final-day.webp", caption: "Final day of school" },
        { src: "/character/locked/aitchison-final-day-2.webp", caption: "Final day of school", vault: "aitchison-final-day-2.webp" },
      ] as Proof[],
    },
    {
      name: "The First Commit Arc",
      years: "2021 – 2023",
      text: "Software intern at Techinoid, two semesters of AI at FAST NUCES, sales intern at GenITeam. Code meets customers.",
      image: "/character/fc-campus.webp",
      gallery: [
        { src: "/character/fc-campus.webp", caption: "Campus days" },
        { src: "/character/fc-scratch.webp", caption: "Lab work in Scratch" },
        { src: "/character/locked/fc-evening.webp", caption: "With friends at an evening event", vault: "fc-evening.webp" },
      ] as Proof[],
    },
    {
      name: "The Toronto Arc",
      years: "2023 – 2026",
      text: "Moved to Canada. Seneca, honour list, PSA vice president — while running e-commerce, contracting as an engineer and leading a dev team.",
      image: "/character/consulate.webp",
      gallery: [
        { src: "/character/consulate.webp", caption: "With the Consul General of Pakistan in Toronto at a 14 August event" },
        { src: "/character/to-cpp.webp", caption: "C++ lab work at Seneca" },
        { src: "/character/to-class-poster.jpg", caption: "Coding in class", video: "/character/to-class.mp4" },
        { src: "/character/to-psa.webp", caption: "PSA booth at Seneca Clubs Fest" },
        { src: "/character/to-indus.webp", caption: "Receiving a certificate of achievement at an Indus Development Foundation event" },
        { src: "/character/to-pyvital.webp", caption: "With Pyvital Sports" },
        { src: "/character/to-sial.webp", caption: "At SIAL Canada, the food and beverage trade show" },
        { src: "/character/to-wize.webp", caption: "At the Wize booth" },
        { src: "/character/to-laptop.webp", caption: "Coding session" },
        { src: "/character/to-datathon.webp", caption: "Hacker badge — Sheridan Datathon" },
        { src: "/character/to-workshop.webp", caption: "Hackathon workshop" },
        { src: "/character/to-hack-team.webp", caption: "At the hackathon" },
        { src: "/character/to-macathon.webp", caption: "Mac-a-Thon 2026" },
        { src: "/character/locked/to-hack-selfie.webp", caption: "Hackathon grind", vault: "to-hack-selfie.webp" },
        { src: "/character/to-conference.webp", caption: "At a conference" },
        { src: "/character/locked/to-event.webp", caption: "At an event", vault: "to-event.webp" },
        { src: "/character/to-friends-poster.jpg", caption: "With friends on campus", video: "/character/to-friends.mp4" },
      ] as Proof[],
    },
    {
      name: "The Builder Arc",
      years: "2026 – ∞",
      text: "Graduated. Building RentOS, shipping small apps daily, looking for the team to build the next big thing with.",
      image: "/character/graduation.webp",
      gallery: [
        { src: "/character/graduation.webp", caption: "Graduation — Seneca Polytechnic, Toronto, June 2026" },
        { src: "/character/b-library.webp", caption: "Toronto Reference Library, July 2026" },
        { src: "/character/locked/builder-bus.webp", caption: "On the bus with the group, July 2026", vault: "builder-bus.webp" },
        { src: "/character/b-fields-poster.jpg", caption: "Fields from the bus window, July 2026", video: "/character/b-fields.mp4" },
        { src: "/character/b-site-walk.webp", caption: "Walking the site, July 2026" },
        { src: "/character/b-elevator.webp", caption: "Grain elevator site visit, July 2026" },
        { src: "/character/b-plant-poster.jpg", caption: "Plant tour, July 2026", video: "/character/b-plant.mp4" },
        { src: "/character/b-group.webp", caption: "Group photo at the grain elevators, July 2026" },
        { src: "/character/b-arcade.webp", caption: "Retro arcade booth, August 2026" },
        { src: "/character/locked/builder-community-event.webp", caption: "Community event, August 2026", vault: "builder-community-event.webp" },
        { src: "/character/locked/builder-night-out.webp", caption: "Night out, August 2026", vault: "builder-night-out.webp" },
      ] as Proof[],
    },
  ],
  achievements: [
    {
      icon: "🏉",
      title: "Rugby Captain",
      detail: "Aitchison College, 2020–21 · College Colour 2019–21",
      proof: [
        { src: "/character/rugby-ball.webp", caption: "In action — No. 1" },
        { src: "/character/rugby-ruck.webp", caption: "At the breakdown — No. 1" },
        { src: "/character/rugby-carry.webp", caption: "Carrying into contact — No. 21" },
        { src: "/character/rugby-21.webp", caption: "Open play — No. 21" },
        { src: "/character/rugby-walkout.webp", caption: "Walking out — No. 1" },
        { src: "/character/rugby-yearbook.webp", caption: "Rugby team — college yearbook" },
        { src: "/character/rugby-team-medals.webp", caption: "Team with medals" },
      ] as Proof[],
    },
    {
      icon: "🏆",
      title: "Punjab Nationals Winner",
      detail: "Rugby, 2019–20",
      proof: [{ src: "/character/rugby-nationals-2019.webp", caption: "24th Men National 7's Rugby Championship 2019 — won the nationals" }] as Proof[],
    },
    {
      icon: "🥇",
      title: "Inter-School Champions",
      detail: "1st Aitchison Inter-School Rugby Championship, 2020",
      proof: [{ src: "/character/rugby-inter-school-2020.webp", caption: "1st Aitchison Inter-School Rugby Championship 2020 — winners" }] as Proof[],
    },
    {
      icon: "🥇",
      title: "Punjab Olympics Winner (U-16)",
      detail: "Rugby, 2018–19",
      proof: [
        { src: "/character/medal-bite.webp", caption: "Rugby 2018–19" },
        { src: "/character/u16-plaque.webp", caption: "U16 7s Rugby Championship — Winner plaque" },
        { src: "/character/rugby-winner-trophy.webp", caption: "Winner's trophy" },
      ] as Proof[],
    },
    { icon: "🌍", title: "Selected Internationally", detail: "Chosen to represent Aitchison in rugby abroad" },
    {
      icon: "🎽",
      title: "Athletics Team",
      detail: "Discus, shot put, 100m, 200m, 4×100m relay",
      proof: [
        { src: "/character/discus-poster.jpg", caption: "Discus throw", video: "/character/discus.mp4" },
        { src: "/character/athletics-award.webp", caption: "Receiving athletics event awards" },
        { src: "/character/athletics-award-2.webp", caption: "Athletics prize-giving" },
        { src: "/character/athletics-team.webp", caption: "Athletics team" },
      ] as Proof[],
    },
    { icon: "🏀", title: "Basketball Team", detail: "Aitchison College, 2016–21" },
    { icon: "🤸", title: "Gymnastics Colour", detail: "Aitchison College, 2016–17" },
    {
      icon: "⚽",
      title: "Daily Football Captain",
      detail: "Led house mates every evening as house prefect",
      proof: [
        { src: "/character/football.webp", caption: "Inter-house football for LJ House" },
        { src: "/character/tug-of-war.webp", caption: "Inter-house tug of war" },
      ] as Proof[],
    },
    { icon: "🎖️", title: "Duke of Edinburgh", detail: "Bronze Award" },
    { icon: "🛡️", title: "School Prefect", detail: "Aitchison College, 2020–21" },
    {
      icon: "🏠",
      title: "Boarding House Leader",
      detail: "House captain & prefect — Leslie Jones (LJ) House",
      proof: [
        { src: "/character/lj-flag.webp", caption: "LJ House flag and the house trophies" },
        { src: "/character/lj-housemaster.webp", caption: "House leaders with the House Master" },
        { src: "/character/trophies-house.webp", caption: "House trophies" },
        { src: "/character/lj-seniors.webp", caption: "LJ House seniors with the trophies" },
        { src: "/character/lj-house.webp", caption: "Leslie Jones House" },
      ] as Proof[],
    },
    {
      icon: "🪪",
      title: "Director Logistics",
      detail: "Ran logistics for a student-run college event (2020)",
      proof: [{ src: "/character/director-badge.webp", caption: "Event badge — Director Logistics" }] as Proof[],
    },
    { icon: "🗳️", title: "Student Council", detail: "3 years, 2017–19" },
    { icon: "💻", title: "CS Society Executive", detail: "4 years on the executive council" },
    { icon: "📚", title: "Head of Reading Program", detail: "Junior school, Gwyn House — 3 years" },
    { icon: "📜", title: "President's Honour List", detail: "Seneca, Winter 2024 — GPA 3.9" },
    { icon: "🇵🇰", title: "PSA Vice President", detail: "Pakistan Students Association, Seneca" },
  ] as { icon: string; title: string; detail: string; proof?: Proof[] }[],
  /** "trophy cabinet" shot for the achievements header */
  cabinet: { src: "/character/medals-all.webp", caption: "The medal & trophy haul" } as Shot,
  community: [
    "Head of Computer Science at Sutoon (Door of Awareness) — taught underprivileged kids to build games in Scratch",
    "14-day teaching programme at Sunrise High School, Depalpur (2019)",
    "Volunteer, Autism Awareness fundraiser (2018)",
    "Tree-plantation volunteer, national Billion Tree campaign",
    "IT programme & seminars at Arfa Karim IT tower",
    "Promoted the World Rugby \"Get Into Rugby\" programme with the team",
  ],
  extras: ["Self-taught Unity, Unreal Engine & Blender as a teen", "Digital artist — commissioned art for a YouTuber", "6+ years of natural bodybuilding"],
  training: [
    { src: "/character/gym-curls-poster.jpg", caption: "Training", video: "/character/gym-curls.mp4" },
    { src: "/character/gym-dumbbells.webp", caption: "Training" },
    { src: "/character/gym-bench.webp", caption: "Training" },
  ] as Proof[],
};

/** Terminal fun-facts and boot lines. */
export const bootLines = [
  "NABEEL.OS v2026.10 — initializing...",
  "[ok] mounting /cloud/aws ... ecs, s3, cognito, dynamodb",
  "[ok] loading neural modules ... gemini, mediapipe",
  "[ok] restoring memories ... lahore, islamabad, toronto",
  "[ok] rugby_captain.service started",
  "[ok] all systems nominal. welcome.",
];
