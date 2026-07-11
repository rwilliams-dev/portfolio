// Navbar shrink on scroll
const navbar = document.querySelector(".navbar");
window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 40);
}, { passive: true });

// Scroll reveal
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

// EmailJS Contact Form
emailjs.init("f9Dng_uDxGBzPQWX3");

document.getElementById("contact-form").addEventListener("submit", function(e) {
  e.preventDefault();

  const btn = document.getElementById("submit-btn");
  const status = document.getElementById("form-status");

  btn.innerText = "Sending...";
  btn.disabled = true;

  const templateParams = {
    from_name: document.getElementById("from_name").value,
    from_email: document.getElementById("from_email").value,
    service: document.getElementById("service").value,
    message: document.getElementById("message").value,
  };

  emailjs.send("service_wshbupp", "template_efq356b", templateParams)
    .then(function() {
      status.innerText = "✅ Message sent! I'll get back to you within 24 hours.";
      status.style.color = "#4ade80";
      btn.innerText = "Send Message";
      btn.disabled = false;
      document.getElementById("contact-form").reset();
    }, function() {
      status.innerText = "Something went wrong. Please email me directly.";
      status.style.color = "red";
      btn.innerText = "Send Message";
      btn.disabled = false;
    });
});