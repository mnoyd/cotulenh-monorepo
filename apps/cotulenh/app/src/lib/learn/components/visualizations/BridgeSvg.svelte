<script>
  // Reusable Bridge SVG component
  // Expects parent to define filter="url(#wood-texture)"
</script>

<svg class="bridge-svg" viewBox="0 0 30 100" preserveAspectRatio="none">
  <!-- Base Planks -->
  <g fill="#b45309" stroke="#78350f" stroke-width="0.5" filter="url(#wood-texture)">
    <!-- Generate planks roughly every 10 units -->
    <rect x="2" y="0" width="26" height="9" rx="1" />
    <rect x="2" y="10" width="26" height="9" rx="1" />
    <rect x="2" y="20" width="26" height="9" rx="1" />
    <rect x="2" y="30" width="26" height="9" rx="1" />
    <rect x="2" y="40" width="26" height="9" rx="1" />
    <rect x="2" y="50" width="26" height="9" rx="1" />
    <rect x="2" y="60" width="26" height="9" rx="1" />
    <rect x="2" y="70" width="26" height="9" rx="1" />
    <rect x="2" y="80" width="26" height="9" rx="1" />
    <rect x="2" y="90" width="26" height="10" rx="1" />
  </g>

  <!-- Side Rails (Base) -->
  <rect x="0" y="0" width="4" height="100" fill="#78350f" />
  <rect x="26" y="0" width="4" height="100" fill="#78350f" />

  <!-- Posts -->
  <rect x="-1" y="5" width="6" height="8" rx="1" fill="#451a03" />
  <rect x="-1" y="45" width="6" height="8" rx="1" fill="#451a03" />
  <rect x="-1" y="85" width="6" height="8" rx="1" fill="#451a03" />

  <rect x="25" y="5" width="6" height="8" rx="1" fill="#451a03" />
  <rect x="25" y="45" width="6" height="8" rx="1" fill="#451a03" />
  <rect x="25" y="85" width="6" height="8" rx="1" fill="#451a03" />

  <!-- Handrails (Top) -->
  <rect x="1" y="0" width="2" height="100" fill="#92400e" opacity="0.8" />
  <rect x="27" y="0" width="2" height="100" fill="#92400e" opacity="0.8" />

  <!-- Nails/Bolts -->
  <circle cx="3" cy="9" r="0.8" fill="#d1d5db" />
  <circle cx="27" cy="9" r="0.8" fill="#d1d5db" />
  <circle cx="3" cy="49" r="0.8" fill="#d1d5db" />
  <circle cx="27" cy="49" r="0.8" fill="#d1d5db" />
  <circle cx="3" cy="89" r="0.8" fill="#d1d5db" />
  <circle cx="27" cy="89" r="0.8" fill="#d1d5db" />
</svg>

<style>
  .bridge-svg {
    width: 24px; /* Much thinner (approx 1/3 of cell width) */
    height: 100%; /* Spans exactly one row height */
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
    flex-shrink: 0;
  }
</style>
