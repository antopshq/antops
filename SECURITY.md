# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### Where to Report

**Please DO NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email your findings to:

**samer.naffah@antopshq.com**

Or use GitHub's private vulnerability reporting feature:
- Navigate to the Security tab
- Click "Report a vulnerability"
- Fill out the form with details

### What to Include

When reporting a vulnerability, please include:

1. **Description** of the vulnerability
2. **Steps to reproduce** the issue
3. **Potential impact** of the vulnerability
4. **Suggested fix** (if you have one)
5. **Your contact information** for follow-up

### Response Timeline

- **Within 24 hours**: We'll acknowledge receipt of your report
- **Within 72 hours**: We'll provide an initial assessment
- **Within 7 days**: We'll share a timeline for a fix
- **Once fixed**: We'll publicly acknowledge your responsible disclosure (with your permission)

## Security Best Practices

### For Users

1. **Keep dependencies updated**
   ```bash
   npm audit
   npm update
   ```

2. **Use environment variables for secrets**
   - Never commit `.env.local` files
   - Never hardcode API keys or passwords
   - Use strong, unique passwords

3. **Enable Supabase Row Level Security (RLS)**
   - Ensure all tables have RLS policies
   - Test policies thoroughly
   - Follow principle of least privilege

4. **Secure your Supabase project**
   - Enable 2FA on your Supabase account
   - Rotate API keys regularly
   - Use service role key only server-side
   - Monitor access logs

5. **Configure CORS properly**
   - Only allow trusted origins
   - Don't use `*` in production
   - Update allowed origins as needed

6. **Use HTTPS in production**
   - Never run production HTTP-only
   - Enable HTTPS for all API calls
   - Use secure cookies

### For Developers

1. **Input Validation**
   ```typescript
   // Always validate and sanitize user input
   function createIncident(data: unknown) {
     const validated = IncidentSchema.parse(data); // Use Zod or similar
     // ... rest of logic
   }
   ```

2. **SQL Injection Prevention**
   ```typescript
   // GOOD: Use parameterized queries
   const { data } = await supabase
     .from('incidents')
     .select('*')
     .eq('id', userId);

   // BAD: Never concatenate user input
   // await supabase.rpc('raw_sql', { query: `SELECT * FROM incidents WHERE id = ${userId}` })
   ```

3. **XSS Prevention**
   - React escapes content by default
   - Be careful with `dangerouslySetInnerHTML`
   - Sanitize rich text content
   - Use Content Security Policy (CSP)

4. **Authentication & Authorization**
   ```typescript
   // Always verify user authentication
   export async function GET(request: Request) {
     const supabase = createServerClient();
     const { data: { user }, error } = await supabase.auth.getUser();

     if (!user) {
       return new Response('Unauthorized', { status: 401 });
     }

     // Check authorization for specific resources
     const canAccess = await checkPermissions(user.id, resourceId);
     if (!canAccess) {
       return new Response('Forbidden', { status: 403 });
     }

     // ... rest of logic
   }
   ```

5. **File Upload Security**
   - Validate file types
   - Limit file sizes
   - Scan for malware
   - Store files outside webroot
   - Use signed URLs for access

6. **Rate Limiting**
   ```typescript
   // Implement rate limiting for sensitive endpoints
   import rateLimit from 'express-rate-limit';

   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   ```

7. **Logging & Monitoring**
   - Log authentication attempts
   - Monitor for suspicious activity
   - Don't log sensitive data (passwords, tokens)
   - Set up alerts for anomalies

8. **Dependency Security**
   - Run `npm audit` regularly
   - Keep dependencies updated
   - Use `npm audit fix` for automated fixes
   - Review security advisories

9. **API Token Security**
   - Generate cryptographically random tokens
   - Hash tokens before storing
   - Implement token expiration
   - Allow token revocation
   - Use scoped permissions

### Environment Security

1. **Development**
   - Use separate Supabase projects for dev/prod
   - Never use production credentials locally
   - Use dummy data for testing
   - Keep test databases isolated

2. **Production**
   - Use environment variables
   - Enable all security headers
   - Set up monitoring and alerting
   - Regular security audits
   - Implement backup procedures

## Known Security Considerations

### Supabase Row Level Security

Ensure RLS is enabled on all tables:

```sql
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's incidents"
ON incidents FOR SELECT
USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
```

### WebSocket Security

- Authenticate WebSocket connections
- Validate all incoming messages
- Implement rate limiting
- Use secure WebSocket (wss://) in production

### File Storage

- Validate file types on upload
- Implement size limits (currently 2MB)
- Scan uploaded files for malware
- Use signed URLs with expiration
- Implement access controls

## Security Headers

Recommended security headers for production:

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  }
};
```

## Compliance

This project aims to follow:

- OWASP Top 10 guidelines
- CWE/SANS Top 25 Most Dangerous Software Errors
- GDPR requirements for data protection

## Security Checklist

Before deploying to production:

- [ ] All environment variables are set
- [ ] HTTPS is enabled
- [ ] RLS policies are configured on all tables
- [ ] API keys are not hardcoded
- [ ] CORS is configured properly
- [ ] Security headers are set
- [ ] File upload validation is implemented
- [ ] Rate limiting is in place
- [ ] Authentication is required for all protected routes
- [ ] Input validation is implemented
- [ ] Dependencies are up to date
- [ ] `npm audit` shows no vulnerabilities
- [ ] Monitoring and logging are set up
- [ ] Backup procedures are in place

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## Questions?

If you have questions about security, please email samer.naffah@antopshq.com

---

Thank you for helping keep ANTOPS secure!
