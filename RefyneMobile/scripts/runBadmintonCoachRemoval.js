// Simple script to run the badminton coach removal
// This can be executed to remove the specific badminton coaches

const { removeSpecificBadmintonCoaches } = require('../utils/coachData.js');

const runRemoval = async () => {
  try {
    console.log('🚀 Starting badminton coach removal process...');
    
    // Remove the specific coaches (Test Coach and jasper)
    const result = await removeSpecificBadmintonCoaches(['test coach', 'jasper']);
    
    console.log('✅ Removal process completed!');
    console.log(`Removed ${result.removed} coaches`);
    
    if (result.coaches && result.coaches.length > 0) {
      console.log('Removed coaches:');
      result.coaches.forEach((coach, index) => {
        console.log(`${index + 1}. ${coach.name} (User ID: ${coach.userId})`);
      });
    }
    
    if (result.error) {
      console.error('Error occurred:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
};

// Run the removal
runRemoval();
