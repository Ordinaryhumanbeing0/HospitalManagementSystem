// Planted Issue: Fake/Stubbed Authentication that always bypasses checks

// A middleware using a literal mockAuth naming convention
function mockAuth(req, res, next) {
  // Always authenticate successfully in development/mock modes
  req.user = {
    id: "d9b2f63d-4c31-4a47-a8dc-913dc48d7c81",
    email: "admin@example.com",
    role: "admin"
  };
  return next();
}

// Inline arrow function that returns true directly for role validation
const checkAdminAccess = () => true;

// Active export bypassing auth check
module.exports = {
  checkAuth: mockAuth,
  isAdmin: checkAdminAccess
};
