const crypto = require('crypto');

function usage() {
  console.log('Usage:');
  console.log('  node scripts/generate-widget-hmac.js --secret <secret> --shop <shop> --variantId <variantId> [--contact <contact> --channel <channel>]');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/generate-widget-hmac.js --secret "$SHOPIFY_API_SECRET" --shop ausdevtheme.myshopify.com --variantId 12345');
  console.log('  node scripts/generate-widget-hmac.js --secret "$SHOPIFY_API_SECRET" --shop ausdevtheme.myshopify.com --variantId 12345 --contact test@example.com --channel EMAIL');
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const value = argv[i + 1];
    args[key.slice(2)] = value;
    i += 1;
  }
  return args;
}

const args = parseArgs(process.argv);
if (!args.secret || !args.shop || !args.variantId) {
  usage();
  process.exit(1);
}

const payload = {
  shop: args.shop,
  variantId: args.variantId,
};

if (args.contact && args.channel) {
  payload.contact = args.contact;
  payload.channel = args.channel;
}

const payloadString = Object.keys(payload)
  .sort()
  .map((key) => `${key}=${payload[key]}`)
  .join('&');

const hmac = crypto.createHmac('sha256', args.secret).update(payloadString).digest('hex');

console.log('payload:', payloadString);
console.log('hmac:', hmac);

