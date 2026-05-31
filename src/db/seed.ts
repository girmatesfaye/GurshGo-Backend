async function main(prisma: any) {
  console.log("Cleaning up existing data...");
  await prisma.payment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.menuItem.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.restaurant.deleteMany({});
  await prisma.driver.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("Seeding users...");
  const [owner, customer, driverUser, admin] = await Promise.all([
    prisma.user.create({
      data: {
        email: "owner@example.com",
        name: "Restaurant Owner",
        password: "password", // replace with hashed value in production
        role: "OWNER",
        phone: "+10000000001",
      },
    }),
    prisma.user.create({
      data: {
        email: "customer@example.com",
        name: "Happy Customer",
        password: "password",
        role: "CUSTOMER",
        phone: "+10000000002",
      },
    }),
    prisma.user.create({
      data: {
        email: "driver@example.com",
        name: "Delivery Driver",
        password: "password",
        role: "DRIVER",
        phone: "+10000000003",
      },
    }),
    prisma.user.create({
      data: {
        email: "admin@example.com",
        name: "Admin",
        password: "password",
        role: "ADMIN",
      },
    }),
  ]);

  console.log("Seeding driver profile...");
  const driver = await prisma.driver.create({
    data: {
      userId: driverUser.id,
      vehicle: "Bike",
      plate: "DRV-100",
      rating: 4.9,
    },
  });

  console.log("Seeding restaurants and menu items...");
  const restaurant = await prisma.restaurant.create({
    data: {
      name: "Gursha Express",
      description: "Fast & delicious local dishes",
      address: "123 Main St",
      lat: 9.0,
      lng: 38.7,
      ownerId: owner.id,
      menuItems: {
        create: [
          {
            name: "Injera w/ Doro Wat",
            description: "Spicy chicken stew with injera",
            price: "7.50",
            available: true,
          },
          {
            name: "Kitfo",
            description: "Minced raw beef seasoned with spices",
            price: "9.00",
            available: true,
          },
          {
            name: "Veg Platter",
            description: "Assorted vegetables and lentils",
            price: "6.00",
            available: true,
          },
        ],
      },
    },
    include: { menuItems: true },
  });

  console.log("Seeding an order with items and payment...");
  const order = await prisma.order.create({
    data: {
      customerId: customer.id,
      restaurantId: restaurant.id,
      driverId: driver.id,
      status: "DELIVERED",
      total: "16.50",
      note: "Please leave at the door",
      items: {
        create: [
          {
            menuItemId: restaurant.menuItems[0].id,
            name: restaurant.menuItems[0].name,
            quantity: 1,
            price: restaurant.menuItems[0].price,
          },
          {
            menuItemId: restaurant.menuItems[1].id,
            name: restaurant.menuItems[1].name,
            quantity: 1,
            price: restaurant.menuItems[1].price,
          },
        ],
      },
      payment: {
        create: {
          amount: "16.50",
          status: "PAID",
          method: "CARD",
        },
      },
    },
    include: { items: true, payment: true },
  });

  console.log("Seeding a review...");
  await prisma.review.create({
    data: {
      userId: customer.id,
      restaurantId: restaurant.id,
      rating: 5,
      comment: "Excellent food and fast delivery!",
    },
  });

  console.log("Seed completed.");
  console.log({
    users: {
      owner: owner.email,
      customer: customer.email,
      driver: driverUser.email,
    },
    restaurant: restaurant.name,
    orderId: order.id,
  });
}

(async () => {
  let prisma: any = undefined;
  try {
    const mod = (await import("@prisma/client")) as any;
    const PrismaClient = mod.PrismaClient;
    prisma = new PrismaClient();
    await main(prisma);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    if (prisma) await prisma.$disconnect();
  }
})();
