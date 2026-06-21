const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ============================================
// EDIT THESE VALUES TO UPDATE ADMIN CREDENTIALS
// ============================================

const ADMIN_EMAIL = 'hasnainzaidi962@gmail.com';  // Change this to your new admin email
const ADMIN_PASSWORD = 'admin123';        // Change this to your new admin password (keep existing or change)

// ============================================
// DO NOT EDIT BELOW THIS LINE
// ============================================

async function updateAdminCredentials() {
  try {
    console.log('🔐 Starting admin credentials update...\n');

    // Validate inputs
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      console.error('❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set!');
      process.exit(1);
    }

    if (ADMIN_PASSWORD.length < 8) {
      console.error('❌ Error: Password must be at least 8 characters long!');
      process.exit(1);
    }

    // Check if admin user exists
    // Find ADMIN user
    let existingAdmin = await prisma.user.findFirst({
      where: {
        role: 'ADMIN'
      },
      select: {
        id: true,
        email: true,
        role: true,
        name: true
      }
    });

    // Hash the new password
    console.log('🔒 Hashing new password...');
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    let updatedAdmin;

    if (!existingAdmin) {
      // No admin exists, create one
      console.log('⚠️  No admin user found. Creating new admin user...\n');
      
      // Check if email already exists
      const emailExists = await prisma.user.findUnique({
        where: { email: ADMIN_EMAIL }
      });

      if (emailExists) {
        console.error(`❌ Error: Email ${ADMIN_EMAIL} is already in use by another user!`);
        process.exit(1);
      }

      // Create new admin user
      console.log('💾 Creating admin user in database...');
      updatedAdmin = await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          password: hashedPassword,
          name: 'Admin',
          role: 'ADMIN',
          status: 'APPROVED',
          isActive: true
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true
        }
      });
      console.log('✅ New admin user created!\n');
    } else {
      console.log(`📧 Current Admin Email: ${existingAdmin.email}`);
      console.log(`👤 Admin Name: ${existingAdmin.name || 'N/A'}`);
      console.log(`🔑 Admin Role: ${existingAdmin.role}\n`);

      // Check if email already exists (for different user)
      if (ADMIN_EMAIL !== existingAdmin.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: ADMIN_EMAIL }
        });

        if (emailExists && emailExists.id !== existingAdmin.id) {
          console.error(`❌ Error: Email ${ADMIN_EMAIL} is already in use by another user!`);
          process.exit(1);
        }
      }

      // Update admin credentials
      console.log('💾 Updating admin credentials in database...');
      updatedAdmin = await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          email: ADMIN_EMAIL,
          password: hashedPassword
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true
        }
      });
    }

    console.log('\n✅ SUCCESS! Admin credentials updated successfully!\n');
    console.log('📋 Updated Admin Details:');
    console.log(`   Email: ${updatedAdmin.email}`);
    console.log(`   Name: ${updatedAdmin.name || 'N/A'}`);
    console.log(`   Role: ${updatedAdmin.role}`);
    console.log(`   Password: ${'*'.repeat(ADMIN_PASSWORD.length)} (hidden)\n`);
    console.log('🔐 You can now log in with the new credentials!\n');

  } catch (error) {
    console.error('\n❌ Error updating admin credentials:');
    console.error(error.message);
    if (error.code === 'P2002') {
      console.error('\n💡 Tip: The email might already be in use. Try a different email.');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateAdminCredentials();