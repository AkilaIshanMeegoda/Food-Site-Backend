export const orderTemplates = {
  orderComplete: (userName, orderId, orderTotal, orderItems) => ({
    subject: `Epic Eats Order #${orderId} Confirmed!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background-color: #6C5CE7; padding: 25px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Order Confirmed!</h1>
          <p style="color: white; margin: 5px 0 0; font-size: 16px;">Your payment was successful</p>
        </div>
        
        <div style="padding: 25px; border: 1px solid #eaeaea;">
          <h2 style="color: #444; margin-top: 0;">Hi ${userName},</h2>
          <p style="font-size: 16px;">Thank you for your order! We've received your payment and your food is being prepared.</p>
          
          <div style="margin: 25px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 15px 0;">
            <p style="font-weight: bold; margin: 0 0 10px;">Order #${orderId}</p>
            ${orderItems.map(item => `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span>${item.quantity}x ${item.name}: </span>
                <span>Rs.${item.price.toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; margin-bottom: 20px;">
            <span>Total Paid: </span>
            <span>Rs.${orderTotal}</span>
          </div>
          
          <p style="font-size: 15px;">We'll notify you when your order is on its way. Expected preparation time: 15-25 minutes.</p>
          
          <div style="text-align: center; margin: 30px 0 20px;">
            <a href="#" style="background-color: #6C5CE7; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Track Your Order</a>
          </div>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 14px; color: #666;">
          <p style="margin: 0;">Questions about your order? <a href="mailto:support@epiceats.com" style="color: #6C5CE7; text-decoration: none;">Contact support</a></p>
          <p style="margin: 10px 0 0;">© ${new Date().getFullYear()} Epic Eats. All rights reserved.</p>
        </div>
      </div>
    `,
  }),
  orderDelivering: (userName, orderId, estimatedTime) => ({
    subject: `Your Epic Eats Order #${orderId} Is On The Way!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background-color: #00B894; padding: 25px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Your food is coming!</h1>
          <p style="color: white; margin: 5px 0 0; font-size: 16px;">Estimated arrival: ${estimatedTime}</p>
        </div>
        
        <div style="padding: 25px; border: 1px solid #eaeaea;">
          <h2 style="color: #444; margin-top: 0;">Hi ${userName},</h2>
          <p style="font-size: 16px;">Your order #${orderId} is out for delivery with our Epic Eats courier!</p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="#" style="background-color: #00B894; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-right: 10px;">Track Order</a>
            <a href="#" style="background-color: white; color: #00B894; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; border: 1px solid #00B894;">Contact Driver</a>
          </div>
          
          <p style="font-size: 15px; color: #666;">Please ensure someone is available to receive your order.</p>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 14px; color: #666;">
          <p style="margin: 0;">Having issues with delivery? <a href="mailto:support@epiceats.com" style="color: #00B894; text-decoration: none;">Contact support</a></p>
          <p style="margin: 10px 0 0;">© ${new Date().getFullYear()} Epic Eats. All rights reserved.</p>
        </div>
      </div>
    `,
  })
};