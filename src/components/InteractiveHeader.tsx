const InteractiveHeader = () => {
  const profile = {
    name: "yudai.f",
    rank: 12,
    level: 7,
    exp: 3,
    exp_required: 10,
    avatar_url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    items: [
      { name: "item1", image_url: "/sword.png" },
      { name: "item2", image_url: "/shield.png" },
      { name: "item3", image_url: "/potion.png" },
    ],
  };
  const progressPercentage = (profile.exp / profile.exp_required) * 100;

  return (
    <header className="bg-pms-card-bg fixed top-0 left-0 right-0 z-10 p-4 h-16 flex items-center justify-between border-b border-pms-border">
      <div className="flex items-center gap-3">
        <img src={profile.avatar_url} alt="avatar" className="w-10 h-10 rounded-full object-cover"/>
        <div>
          <p className="text-pms-text-primary font-semibold text-sm">{profile.name}</p>
          <div className="flex items-center gap-2">
            <p className="text-pms-text-secondary text-xs">Lv.{profile.level}</p>
            <div className="w-24 h-2 bg-pms-border rounded-full overflow-hidden">
                <div className="h-full bg-pms-accent-pink" style={{ width: `${progressPercentage}%`}}></div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <p className="text-pms-text-primary text-sm">Rank: <span className="font-bold">{profile.rank}</span></p>
        <button className="p-2 rounded-full hover:bg-gray-100">
            <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M8 19.5c0 .828427 1.79086 1.5 4 1.5s4-.671573 4-1.5c0-.629-1.011-1.1637-2.5029-1.3995C14.7345 18.0373 16 17.147 16 16c0-1.473-1.791-2.5-4-2.5s-4 1.027-4 2.5c0 1.147 1.2655 2.0373 2.5029 2.1005C9.011 18.3363 8 18.871 8 19.5z M8.0625 10c0-1.933 1.7625-3.5 3.9375-3.5s3.9375 1.567 3.9375 3.5c0 1.731-1.2938 3.165-3.0375 3.444V14.5h-1.8V13.444c-1.7437-.279-3.0375-1.713-3.0375-3.444zM4.5 9.5c0 .828.672 1.5 1.5 1.5s1.5-.672 1.5-1.5S6.828 8 6 8s-1.5.672-1.5 1.5z m13.5 0c0 .828.672 1.5 1.5 1.5s1.5-.672 1.5-1.5S18.828 8 18 8s-1.5.672-1.5 1.5z"/></svg>
        </button>
        <button className="p-2 rounded-full hover:bg-gray-100">
            <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M4 21V10.075q0-.675.325-1.263T5.2 8.05L11.275 3.1q.425-.3.963-.45t1.112-.15q.575 0 1.113.15t.962.45L20.8 8.05q.55.475.875 1.063T22 10.075V21h-6v-6h-4v6H4Z"/></svg>
        </button>
      </div>
    </header>
  );
};

export default InteractiveHeader;
