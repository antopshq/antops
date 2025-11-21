# ANTOPS - AI powered IT operations platform

> A modern, real-time IT operations platform built with Next.js, Supabase, and AI-powered insights.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15.4-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

## ✨ Features

### Core ITIL Management
- **📋 Incident Management** - Track, prioritize, and resolve incidents with full lifecycle management
- **🔍 Problem Management** - Root cause analysis, workarounds, and permanent solutions
- **🔄 Change Management** - Approval workflows, scheduling, and rollback planning
- **🏗️ Infrastructure Mapping** - Visual network topology with drag-and-drop interface

### Collaboration
- **💬 Real-time Comments** - WebSocket-powered live collaboration
- **👥 Mentions & Notifications** - @mention team members, instant notifications
- **📎 File Attachments** - Attach files to incidents, problems, and changes
- **🔔 Smart Notifications** - Context-aware alerts for assignments and updates

### AI-Powered Features
- **🤖 Risk Analysis** - AI-powered component risk scoring
- **📊 Impact Assessment** - Automatic dependency analysis
- **💡 Insights** - Intelligent recommendations for incident resolution
- **🎯 Failure Prediction** - Proactive identification of potential issues

### Integrations
- **📟 PagerDuty** - Automatic incident creation from PagerDuty alerts
- **📈 Grafana** - Webhook integration for monitoring alerts
- **🔌 REST API** - Full API for custom integrations
- **🔐 API Tokens** - Secure programmatic access

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account (free tier works)
- OpenAI API key (optional, for AI features)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/antopshq/antops.git
cd antops/antops-app
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up Supabase**

- Create a new project at [supabase.com](https://supabase.com)
- Run the complete database schema:
  - Copy contents of `complete-schema.sql`
  - Paste in Supabase SQL Editor
  - Click "Run" to create all tables, functions, and policies
  - This includes all 28 tables, RLS policies, triggers, and views

4. **Configure environment variables**

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI (optional, for AI features)
OPENAI_API_KEY=sk-your-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

5. **Run the development server**

```bash
npm run dev
```

6. **Open the app**

Visit [http://localhost:3000](http://localhost:3000)

## 🏗️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js custom server (WebSocket)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **AI**: OpenAI GPT-4o-mini
- **Real-time**: Socket.io
- **UI Components**: Radix UI, shadcn/ui
- **Rich Text**: Tiptap
- **Diagrams**: ReactFlow

## 📁 Project Structure

```
antops-app/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   ├── incidents/         # Incident management pages
│   │   ├── problems/          # Problem management pages
│   │   ├── changes/           # Change management pages
│   │   └── infrastructure/    # Infrastructure mapping
│   ├── components/            # React components
│   │   ├── ui/               # Base UI components
│   │   ├── incidents/        # Incident-specific components
│   │   ├── problems/         # Problem-specific components
│   │   └── changes/          # Change-specific components
│   └── lib/                   # Utility functions
│       ├── supabase/         # Supabase client
│       ├── store.ts          # Data access layer
│       ├── openai-client.ts  # AI integration
│       └── websocket-server.ts # Real-time server
├── server.js                  # Custom Node.js server (WebSocket)
├── public/                    # Static assets
└── package.json              # Dependencies
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `OPENAI_API_KEY` | No | OpenAI API key for AI features |
| `STRIPE_SECRET_KEY` | No | Stripe key for billing (if using) |
| `PAGERDUTY_API_KEY` | No | PagerDuty integration key |

### Database Setup

The complete database schema is in **`complete-schema.sql`** (single source of truth).

**What's included:**
- ✅ All 28 tables (incidents, problems, changes, infrastructure, integrations, etc.)
- ✅ All Row Level Security (RLS) policies
- ✅ All triggers and functions
- ✅ All indexes and constraints
- ✅ All views and sequences
- ✅ Complete with sample data structure

**To set up:**
1. Copy the entire contents of `complete-schema.sql`
2. Paste into Supabase SQL Editor
3. Run once - that's it!

No need for incremental migrations - everything is included.

## 📚 Documentation

- **API Documentation**: See `/docs/API.md` (coming soon)
- **Deployment Guide**: See `/docs/DEPLOYMENT.md` (coming soon)
- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md)

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### How to Contribute

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Custom workflows builder
- [ ] Slack integration
- [ ] MS Teams integration
- [ ] Jira synchronization
- [ ] Advanced SLA management
- [ ] Multi-language support
- [ ] Theme customization
- [ ] Self-hosted deployment option

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔒 Security

See [SECURITY.md](SECURITY.md) for security policy and reporting vulnerabilities.

**Important**: Never commit sensitive data:
- Don't commit `.env.local` files
- Don't include API keys in code
- Use environment variables for secrets

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/antopshq/antops/issues)
- **Discussions**: [GitHub Discussions](https://github.com/antopshq/antops/discussions)
- **Email**: samer.naffah@antopshq.com

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [Supabase](https://supabase.com/)
- AI by [OpenAI](https://openai.com/)
- UI components from [Radix UI](https://radix-ui.com/)
- Icons from [Lucide](https://lucide.dev/)

---

**Made with ❤️ by the ANTOPS team**
