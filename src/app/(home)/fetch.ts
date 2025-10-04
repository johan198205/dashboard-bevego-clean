// Mock data for home page components
export async function getChatsData() {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return [
    {
      name: "John Doe",
      isActive: true,
      profile: "/images/user/user-01.png",
      unreadCount: 2,
      lastMessage: {
        content: "Hej, hur mår du?",
        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString()
      }
    },
    {
      name: "Jane Smith", 
      isActive: false,
      profile: "/images/user/user-02.png",
      unreadCount: 0,
      lastMessage: {
        content: "Tack för hjälpen!",
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
      }
    },
    {
      name: "Mike Johnson",
      isActive: true,
      profile: "/images/user/user-03.png",
      unreadCount: 1,
      lastMessage: {
        content: "Kan vi träffas imorgon?",
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString()
      }
    }
  ];
}

export async function getOverviewData() {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  return {
    views: {
      value: 125000,
      growthRate: 12.5
    },
    profit: {
      value: 45000,
      growthRate: -2.3
    },
    products: {
      value: 1250,
      growthRate: 8.1
    },
    users: {
      value: 8900,
      growthRate: 15.2
    }
  };
}

export async function getClarityScoreData() {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Generate mock Clarity Score data
  const score = Math.floor(Math.random() * 40) + 60; // 60-100 range
  let grade: 'Bra' | 'Behöver förbättras' | 'Dålig' | 'N/A';
  let growthRate: number;
  
  if (score >= 80) {
    grade = 'Bra';
    growthRate = Math.random() * 10 + 5; // 5-15% positive growth
  } else if (score >= 60) {
    grade = 'Behöver förbättras';
    growthRate = Math.random() * 5 - 2.5; // -2.5 to +2.5% mixed
  } else {
    grade = 'Dålig';
    growthRate = -(Math.random() * 10 + 5); // -5 to -15% negative growth
  }
  
  return {
    score: {
      value: `${score} / 100`,
      growthRate: growthRate,
      grade: grade
    }
  };
}
